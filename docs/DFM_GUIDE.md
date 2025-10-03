# Design for Manufacturability (DFM) Guide

This guide explains the Design for Manufacturability (DFM) analysis features of the CNC Quote Platform.

## 1. Introduction to DFM

DFM is the process of designing parts for ease of manufacturing. The goal is to identify potential manufacturing issues early in the design process. This helps to:
-   Reduce manufacturing costs.
-   Improve part quality.
-   Shorten production lead times.

Our platform automates DFM analysis for your uploaded CAD files.

## 2. DFM Rules and Checks

The DFM engine analyzes your part's geometry against a set of rules. Here are some examples of the checks performed:

### 2.1. For CNC Machining
-   **Thin Walls**: Detects walls that are too thin to be machined reliably.
-   **Small Holes**: Identifies holes that are too small for standard drill bits.
-   **Deep Pockets**: Checks for pockets that are too deep relative to their width, which can cause tool chatter and breakage.
-   **Sharp Internal Corners**: Sharp internal corners require special tooling (or cannot be made at all). The engine suggests adding a radius.
-   **Undercuts**: Detects features that cannot be machined with a standard 3-axis CNC machine.

### 2.2. For Sheet Metal
-   **Bend Radius**: Ensures the bend radius is appropriate for the material thickness.
-   **Hole-to-Edge Distance**: Checks that holes are not too close to an edge or a bend, which can cause deformation.
-   **Feature Spacing**: Ensures there is enough space between features like holes and cutouts.

## 3. Interpreting DFM Feedback

After you upload a part, the DFM analysis runs automatically. The results are presented in a clear and actionable format.

### 3.1. DFM Panel
On the quote page, you will find a DFM panel with a summary of the analysis. Issues are categorized by severity:

-   <span style="color:red;">**Blocker**</span>: A critical issue that makes the part unmanufacturable as designed. This must be fixed.
-   <span style="color:orange;">**Warning**</span>: An issue that may increase cost or risk quality problems. It is highly recommended to address these.
-   <span style="color:green;">**Passed**</span>: A check that has passed, indicating good design practice.

### 3.2. 3D Viewer Integration
-   DFM issues are highlighted directly on the 3D model of your part.
-   Clicking on an issue in the DFM panel will zoom in and highlight the corresponding feature in the 3D viewer.

### 3.3. Suggestions for Improvement
-   For each issue detected, the platform provides clear suggestions on how to fix it.
-   For example, for a thin wall, it might suggest increasing the thickness to a recommended minimum.

## 4. Optimizing Designs for Manufacturing

Here are some general tips for designing manufacturable parts:

-   **Simplify your design**: The simpler the geometry, the cheaper and faster it is to machine.
-   **Use standard hole sizes**: Align your hole diameters with standard drill bit sizes.
-   **Add generous corner radii**: Avoid sharp internal corners wherever possible.
-   **Maintain uniform wall thickness**: This reduces the risk of warping and other defects.
-   **Consult material guidelines**: Be aware of the manufacturing limitations of your chosen material.

By using the D-F-M feedback from our platform, you can iterate on your designs quickly and confidently, ensuring you get high-quality parts at the best possible price.
