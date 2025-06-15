import React from 'react';
import PaymentLinksWYSIWYGEditor from './components/PaymentLinksWYSIWYGEditor';
import NotesSection from './components/NotesSection';
import './index.css';

function App() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PaymentLinksWYSIWYGEditor />
      <NotesSection />
    </div>
  );
}

export default App;