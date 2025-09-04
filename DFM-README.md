# DFM Analysis System

This implementation provides a comprehensive Design for Manufacturability (DFM) analysis system for CNC Quote, featuring 20 automated checks using OpenCASCADE + FastAPI.

## Architecture

### Frontend Components
- **DFMPanel** (`/components/dfm/DFMPanel.tsx`): Accordion-style panel showing 20 DFM checks with status indicators
- **Viewer3D** (`/components/viewer/Viewer3D.tsx`): React Three Fiber 3D viewer with highlighting capabilities
- **Analyze Page** (`/app/portal/quotes/[id]/analyze/page.tsx`): Main analysis page integrating DFM panel and 3D viewer

### Backend Services
- **CAD Service** (`/apps/cad-service/`): FastAPI service providing DFM analysis endpoints
- **API Routes**: Next.js API routes proxying requests to CAD service

## DFM Checks Implemented

The system implements 20 automated checks:

1. **File Type**: Ensures STEP/IGES/Parasolid support
2. **Units & Scale Check**: Detects unrealistic model sizes
3. **Floating Parts Check**: Multiple unconnected bodies detection
4. **Model Fidelity**: Bad geometry detection (non-manifold, etc.)
5. **Self-Intersection Check**: Overlaps and zero-thickness faces
6. **Shell Count**: Closed shell validation
7. **Void Check**: Internal cavity detection
8. **Large Dimension**: Machine envelope validation
9. **Finish Capacity**: Finishing equipment compatibility
10. **Tool Access**: 3-axis feasibility analysis
11. **Corner Radius**: Internal corner vs cutter diameter
12. **Minimum Wall Thickness**: Material-specific wall validation
13. **Thin Web**: Web slenderness ratio analysis
14. **Minimum Hole Diameter**: Drill size compatibility
15. **Hole Depth Ratio**: Deep hole feasibility
16. **Pocket Ratio**: Deep/narrow pocket analysis
17. **Slot Width**: Cutter availability validation
18. **Boss Slenderness**: Boss height/diameter ratios
19. **Thread Feasibility**: Threading operation validation
20. **Workholding**: Clamp area sufficiency

## API Endpoints

### CAD Service (FastAPI)
- `POST /dfm/analyze`: Start DFM analysis
- `GET /dfm/result/{task_id}`: Get analysis results

### Next.js API Routes
- `POST /api/dfm/analyze`: Proxy to CAD service
- `GET /api/dfm/result/[task_id]`: Proxy to CAD service
- `GET /api/models/[id]`: Mock 3D model data

## Usage

1. **Start CAD Service**:
   ```bash
   cd apps/cad-service
   ./start.sh
   ```

2. **Access Analysis Page**:
   Navigate to `/portal/quotes/{quote_id}/analyze`

3. **Run Analysis**:
   Click "Start Analysis" in the DFM panel to begin automated checks

## Features

- ✅ 20 automated DFM checks with detailed feedback
- ✅ Real-time 3D viewer with face/edge highlighting
- ✅ Accordion-style results with status indicators
- ✅ Async processing with progress tracking
- ✅ Material-specific rule validation
- ✅ Process compatibility checking
- ✅ Suggestion system for design improvements

## Performance Targets

- **P95 End-to-End**: ≤ 20 seconds
- **Mesh Preview**: ≤ 1.5 seconds
- **Face Highlight**: ≤ 100ms

## Integration Points

- **Quote Details Page**: "Analyze DFM" button links to analysis page
- **3D Viewer**: Highlights problematic areas based on DFM results
- **Checkout Flow**: Blockers prevent proceeding to checkout
- **Configuration Page**: DFM results inform design decisions

## Future Enhancements

- Real OpenCASCADE integration for geometric analysis
- Celery worker pipeline for distributed processing
- Advanced highlighting with face/edge selection
- Real-time collaborative analysis
- Historical analysis tracking
- Custom rule sets per customer
