import React from "react";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <>
      <h1>Home Page</h1>
      <Link to="/stockPrices">
        <h2>Click here to view Stock Prices</h2>
      </Link>
    </>
  );
}

export default HomePage;
