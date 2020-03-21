import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

function App() {
  return (
    <Router>
      <div>
        <ul>
          <li>
            <Link to="/">Infra</Link>
          </li>
          <li>
            <Link to="/as">As</Link>
          </li>
          <li>
            <Link to="/node">Node</Link>
          </li>
        </ul>

        <hr />

        <Switch>
          <Route exact path="/">
            <h2>Infra</h2>
          </Route>
          <Route path="/as">
            <h2>As</h2>
          </Route>
          <Route path="/node">
            <h2>Node</h2>
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
