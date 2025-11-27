import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux"; // ✅ Add this
import App from "./App";
import "./index.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Store from "./ReduxStore";
// import "antd/dist/reset.css";
// import "./styles/assignmentModal.css"; // jo bhi aapne assignmentModal wali CSS file rakhi hai


// Root element
const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

// Render App
root.render(
  <Provider store={Store}>
    <BrowserRouter>
      <App className="scrollbar-hidden" />
    </BrowserRouter>
  </Provider>
);
