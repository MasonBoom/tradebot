import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import StockPrices from "./pages/StockPrices/StockPrices";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stockPrices" element={<StockPrices />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
