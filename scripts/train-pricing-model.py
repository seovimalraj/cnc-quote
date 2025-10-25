#!/usr/bin/env python3
"""
LightGBM training script for ML-based pricing
Trains on CAD features extracted by OpenCascade

Usage:
  python train_pricing_model.py --data features.csv --output model.txt

Dependencies:
  pip install lightgbm pandas numpy scikit-learn
"""

import argparse
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import json
import pickle


def load_data(data_path: str) -> pd.DataFrame:
    """Load feature data (CSV or JSON)"""
    if data_path.endswith('.csv'):
        return pd.read_csv(data_path)
    elif data_path.endswith('.json'):
        return pd.read_json(data_path)
    else:
        raise ValueError(f"Unsupported file format: {data_path}")


def prepare_features(df: pd.DataFrame) -> tuple:
    """
    Prepare feature matrix and target variable
    
    Expected columns:
    - CAD features: dim_x, dim_y, dim_z, volume, surface_area, face_count, etc.
    - Material info: material_id, material_density, material_cost_per_kg
    - Process info: process_type (cnc_mill, cnc_lathe, etc.)
    - Target: price (in USD)
    """
    
    # Define feature columns
    feature_cols = [
        # Geometric features
        'dim_x', 'dim_y', 'dim_z', 'max_dim', 'min_dim', 'dim_ratio',
        'volume', 'surface_area', 'surface_to_volume_ratio',
        'face_count', 'edge_count', 'solid_count', 'complexity_score',
        'bbox_volume', 'bbox_utilization',
        
        # Material features
        'material_density', 'material_cost_per_kg', 'material_machinability',
        
        # Process features
        'process_cnc_mill', 'process_cnc_lathe', 'process_wire_edm',
        
        # Business features
        'quantity', 'lead_time_days', 'tolerance_grade',
    ]
    
    # Filter to available columns
    available_cols = [col for col in feature_cols if col in df.columns]
    
    X = df[available_cols]
    y = df['price']
    
    return X, y, available_cols


def train_model(X_train, y_train, X_val, y_val, params=None):
    """Train LightGBM model"""
    
    if params is None:
        params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': 0,
            'seed': 42,
        }
    
    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
    
    model = lgb.train(
        params,
        train_data,
        num_boost_round=1000,
        valid_sets=[train_data, val_data],
        valid_names=['train', 'val'],
        callbacks=[
            lgb.early_stopping(stopping_rounds=50),
            lgb.log_evaluation(period=100),
        ]
    )
    
    return model


def evaluate_model(model, X_test, y_test):
    """Evaluate model performance"""
    y_pred = model.predict(X_test, num_iteration=model.best_iteration)
    
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    # Mean Absolute Percentage Error
    mape = np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100
    
    return {
        'rmse': rmse,
        'mae': mae,
        'r2': r2,
        'mape': mape,
    }


def main():
    parser = argparse.ArgumentParser(description='Train LightGBM pricing model')
    parser.add_argument('--data', required=True, help='Path to training data (CSV or JSON)')
    parser.add_argument('--output', default='pricing_model.txt', help='Output model file')
    parser.add_argument('--test-split', type=float, default=0.2, help='Test set fraction')
    parser.add_argument('--val-split', type=float, default=0.1, help='Validation set fraction')
    
    args = parser.parse_args()
    
    print(f"Loading data from {args.data}...")
    df = load_data(args.data)
    print(f"Loaded {len(df)} samples")
    
    print("\nPreparing features...")
    X, y, feature_cols = prepare_features(df)
    print(f"Features: {len(feature_cols)}")
    print(f"Target range: ${y.min():.2f} - ${y.max():.2f}")
    
    # Split data
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=args.test_split, random_state=42
    )
    
    val_size = args.val_split / (1 - args.test_split)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=val_size, random_state=42
    )
    
    print(f"\nTrain: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")
    
    print("\nTraining model...")
    model = train_model(X_train, y_train, X_val, y_val)
    
    print("\nEvaluating on test set...")
    metrics = evaluate_model(model, X_test, y_test)
    
    print("\nTest Set Performance:")
    print(f"  RMSE: ${metrics['rmse']:.2f}")
    print(f"  MAE: ${metrics['mae']:.2f}")
    print(f"  R²: {metrics['r2']:.4f}")
    print(f"  MAPE: {metrics['mape']:.2f}%")
    
    # Feature importance
    print("\nTop 10 Feature Importances:")
    importance = model.feature_importance(importance_type='gain')
    feature_importance = sorted(zip(feature_cols, importance), key=lambda x: x[1], reverse=True)
    for feat, imp in feature_importance[:10]:
        print(f"  {feat}: {imp:.2f}")
    
    # Save model
    print(f"\nSaving model to {args.output}...")
    model.save_model(args.output)
    
    # Save feature config
    config_path = args.output.replace('.txt', '_config.json')
    with open(config_path, 'w') as f:
        json.dump({
            'features': feature_cols,
            'metrics': metrics,
            'feature_importance': dict(feature_importance),
        }, f, indent=2)
    print(f"Saved config to {config_path}")
    
    print("\n✓ Training complete!")
    print(f"\nTo use this model in production:")
    print(f"  1. Load model: model = lgb.Booster(model_file='{args.output}')")
    print(f"  2. Predict: price = model.predict(features)")


if __name__ == '__main__':
    main()
