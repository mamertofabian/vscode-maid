/**
 * Main App component that renders the appropriate view based on the view type.
 */

import React from "react";
import KnowledgeGraph from "./components/KnowledgeGraph/KnowledgeGraph";
import Dashboard from "./components/Dashboard/Dashboard";
import History from "./components/History/History";
import ManifestChain from "./components/ManifestChain/ManifestChain";
import ImpactAnalysis from "./components/ImpactAnalysis/ImpactAnalysis";
import HierarchicalView from "./components/HierarchicalView/HierarchicalView";
import ManifestDesigner from "./components/ManifestDesigner/ManifestDesigner";

export type ViewType =
  | "knowledgeGraph"
  | "dashboard"
  | "history"
  | "manifestChain"
  | "impactAnalysis"
  | "hierarchicalView"
  | "manifestDesigner";

interface AppProps {
  viewType: ViewType;
}

const App: React.FC<AppProps> = ({ viewType }) => {
  switch (viewType) {
    case "dashboard":
      return <Dashboard />;
    case "history":
      return <History />;
    case "manifestChain":
      return <ManifestChain />;
    case "impactAnalysis":
      return <ImpactAnalysis />;
    case "hierarchicalView":
      return <HierarchicalView />;
    case "manifestDesigner":
      return <ManifestDesigner />;
    case "knowledgeGraph":
    default:
      return <KnowledgeGraph />;
  }
};

export default App;
