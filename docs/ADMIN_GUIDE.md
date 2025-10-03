# Administrator Guide

This guide is for platform administrators and provides an overview of the tools and features available for managing the CNC Quote Platform.

## 1. Dashboard Overview

The admin dashboard provides a high-level view of the platform's activity, including:
-   **Key Metrics**: Total users, number of quotes generated, active orders, and revenue.
-   **Recent Activity**: A feed of recent user sign-ups, quotes, and orders.
-   **System Health**: Status of background services like the CAD analysis engine and job queues.

## 2. User and Organization Management

### 2.1. Managing Users
-   Navigate to **Users** in the admin panel.
-   Here you can:
    -   View a list of all registered users.
    -   Search and filter users.
    -   View a user's details, including their organization and role.
    -   Deactivate or suspend user accounts.

### 2.2. Managing Organizations
-   Navigate to **Organizations**.
-   This section allows you to:
    -   View all organizations on the platform.
    -   See the members of each organization.
    -   Manage organization-specific settings if applicable.

## 3. Pricing and Catalog Configuration

The platform's pricing is driven by a configurable catalog of materials, finishes, and machines.

### 3.1. Materials Catalog
-   Go to **Catalog > Materials**.
-   You can:
    -   Add new materials.
    -   Edit existing materials, including their properties (e.g., density, cost per kg).
    -   Define which manufacturing processes are compatible with each material.

### 3.2. Finishes Catalog
-   Go to **Catalog > Finishes**.
-   Manage the list of available surface finishes and their associated costs.

### 3.3. Machine Configuration
-   Go to **Catalog > Machines**.
-   Configure the machines available for manufacturing, including their hourly rates and capabilities. This data is used by the pricing engine to calculate machining costs.

### 3.4. Pricing Rules
-   The pricing engine uses a combination of geometric analysis and catalog data.
-   Admins can tweak global pricing parameters, such as:
    -   Margin percentages.
    -   Setup fees.
    -   Lead time multipliers for expedited options.

## 4. Order Fulfillment Workflow

### 4.1. Order Dashboard
-   Navigate to the **Orders** section in the admin panel.
-   This provides a Kanban-style board or a list view of all orders, categorized by their status (e.g., `Pending`, `In Production`, `Shipped`, `Completed`).

### 4.2. Managing Orders
-   Click on an order to view its details, including the parts, specifications, and customer information.
-   Update the status of an order as it moves through the fulfillment process.
-   Upload relevant documents, such as Quality Assurance reports or shipping labels.

## 5. System Monitoring

### 5.1. Job Queues
-   The platform uses background job queues for tasks like CAD analysis.
-   The **System Monitoring** section provides a view into these queues, showing:
    -   The number of active, completed, and failed jobs.
    -   Details of failed jobs for debugging purposes.

### 5.2. Analytics
-   The platform integrates with monitoring tools like Prometheus and Grafana.
-   Admins can access Grafana dashboards to view detailed metrics on:
    -   API performance (latency, error rates).
    -   System resource usage (CPU, memory).
    -   Business-level KPIs.

---

For more technical details on the system's architecture and how to manage it, please refer to the [Developer Guide](./DEVELOPER_GUIDE.md) and [Deployment Guide](./DEPLOYMENT_GUIDE.md).
