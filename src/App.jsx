import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrototypeMenu from './components/prototypes/PrototypeMenu';
import PrototypeLayout from './components/prototypes/PrototypeLayout';
import PaymentLinksPrototype from './components/prototypes/PaymentLinksPrototype';
// import AnalyticsDashboard from './components/prototypes/AnalyticsDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main prototype dashboard */}
        <Route path="/" element={<PrototypeMenu />} />
        <Route path="/prototypes" element={<PrototypeMenu />} />
        
        {/* Individual prototypes wrapped in layout */}
        <Route path="/prototypes/payment-links" element={<PrototypeLayout />}>
          <Route index element={<PaymentLinksPrototype />} />
        </Route>
        {/* <Route path="/prototypes/analytics-dashboard" element={<AnalyticsDashboard />} /> */}
      </Routes>
    </Router>
  );
}

export default App;