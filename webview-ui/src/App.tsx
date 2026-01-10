/**
 * Main App component that renders the appropriate view based on the view type.
 */

import React from "react";
import KnowledgeGraph from "./components/KnowledgeGraph/KnowledgeGraph";
import Dashboard from "./components/Dashboard/Dashboard";
import History from "./components/History/History";
import ManifestChain from "./components/ManifestChain/ManifestChain";

interface AppProps {
  viewType: "knowledgeGraph" | "dashboard" | "history" | "manifestChain";
}

const App: React.FC<AppProps> = ({ viewType }) => {
  switch (viewType) {
    case "dashboard":
      return <Dashboard />;
    case "history":
      return <History />;
    case "manifestChain":
      return <ManifestChain />;
    case "knowledgeGraph":
    default:
      return <KnowledgeGraph />;
  }
};

export default App;
