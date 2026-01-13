/**
 * Behavioral tests for task-025: Dashboard panel metrics collection
 * Tests the new methods: _collectSystemMetrics, _computeHealth, _getDependencyStats
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import "./vscode-mock";
import * as vscode from "vscode";
import { DashboardPanel } from "../src/webview/dashboardPanel";

describe("DashboardPanel Metrics Collection", () => {
  beforeEach(() => {
    DashboardPanel.currentPanel = undefined;
  });

  describe("_collectSystemMetrics", () => {
    it("should return a SystemMetrics object", async () => {
      const mockUri = vscode.Uri.file("/test");
      const panel = DashboardPanel.createOrShow(mockUri);

      // Access the private method via type assertion
      const collectMetrics = (panel as any)._collectSystemMetrics.bind(panel);
      const metrics = await collectMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalManifests).toBe("number");
      expect(typeof metrics.validManifests).toBe("number");
      expect(typeof metrics.errorCount).toBe("number");
      expect(typeof metrics.warningCount).toBe("number");
      expect(metrics.fileTracking).toBeDefined();
      expect(typeof metrics.coverage).toBe("number");
    });
  });

  describe("_computeHealth", () => {
    it("should return a number between 0 and 100", () => {
      const mockUri = vscode.Uri.file("/test");
      const panel = DashboardPanel.createOrShow(mockUri);

      // Access the private method via type assertion
      const computeHealth = (panel as any)._computeHealth.bind(panel);

      const metrics = {
        totalManifests: 10,
        validManifests: 8,
        errorCount: 2,
        warningCount: 3,
        fileTracking: {
          undeclared: 0,
          registered: 0,
          tracked: 5,
        },
        coverage: 80,
      };

      const health = computeHealth(metrics);

      expect(typeof health).toBe("number");
      expect(health).toBeGreaterThanOrEqual(0);
      expect(health).toBeLessThanOrEqual(100);
    });

    it("should return 100 for perfect metrics", () => {
      const mockUri = vscode.Uri.file("/test");
      const panel = DashboardPanel.createOrShow(mockUri);

      const computeHealth = (panel as any)._computeHealth.bind(panel);

      const perfectMetrics = {
        totalManifests: 10,
        validManifests: 10,
        errorCount: 0,
        warningCount: 0,
        fileTracking: {
          undeclared: 0,
          registered: 0,
          tracked: 10,
        },
        coverage: 100,
      };

      const health = computeHealth(perfectMetrics);
      expect(health).toBe(100);
    });

    it("should return 0 for zero manifests", () => {
      const mockUri = vscode.Uri.file("/test");
      const panel = DashboardPanel.createOrShow(mockUri);

      const computeHealth = (panel as any)._computeHealth.bind(panel);

      const emptyMetrics = {
        totalManifests: 0,
        validManifests: 0,
        errorCount: 0,
        warningCount: 0,
        fileTracking: {
          undeclared: 0,
          registered: 0,
          tracked: 0,
        },
        coverage: 0,
      };

      const health = computeHealth(emptyMetrics);
      expect(health).toBe(0);
    });
  });

  describe("_getDependencyStats", () => {
    it("should return an object with dependency statistics", () => {
      const mockUri = vscode.Uri.file("/test");
      const panel = DashboardPanel.createOrShow(mockUri);

      // Access the private method via type assertion
      const getDependencyStats = (panel as any)._getDependencyStats.bind(panel);
      const stats = getDependencyStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
      expect(typeof stats.totalFiles).toBe("number");
      expect(typeof stats.supersessionChains).toBe("number");
      expect(typeof stats.averageFilesPerManifest).toBe("number");
    });
  });
});
