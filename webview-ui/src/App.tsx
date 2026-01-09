/**
 * Main App component that renders the appropriate view based on the view type.
 */

import React from "react";
import KnowledgeGraph from "./components/KnowledgeGraph/KnowledgeGraph";
import Dashboard from "./components/Dashboard/Dashboard";

interface AppProps {
  viewType: "knowledgeGraph" | "dashboard";
}

const App: React.FC<AppProps> = ({ viewType }) => {
  switch (viewType) {
    case "dashboard":
      return <Dashboard />;
    case "knowledgeGraph":
    default:
      return <KnowledgeGraph />;
  }
};

export default App;
