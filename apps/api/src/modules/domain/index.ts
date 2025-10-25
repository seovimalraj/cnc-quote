/**
 * Domain Entity Modules
 * Core business entities and catalogs
 */

// Catalog Management
export { CatalogModule } from './catalog/catalog.module';

// Geometry & CAD
export { GeometryModule } from './geometry/geometry.module';

// Machine Management
export { MachineModule } from './machines/machine.module';

// Finish Operations
export { FinishesModule } from './finishes/finishes.module';
export { FinishesService } from './finishes/finishes.service';

// Reference Data Lookups
export { LookupsModule } from './lookups/lookups.module';
