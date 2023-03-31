import React, { useState, useEffect } from 'react';
import axios from 'axios';

const apiKey = process.env; 
const symbol = 'TSLA'; // symbol for Tesla Inc.

function StockPrices() {
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    // fetch daily adjusted stock prices for TSLA for the past year
    axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`)
      .then(response => {
        // extract the data from the response object
        const data = response.data['Time Series (Daily)'];

        // loop through each day's data and extract the closing price
        const prices = [];
        for (const date in data) {
          prices.push({
            date: date,
            price: parseFloat(data[date]['4. close'])
          });
        }

        setPrices(prices);
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  return (
    <div>
      <h1>Historical Stock Prices for TSLA</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Closing Price</th>
          </tr>
        </thead>
        <tbody>
          {prices.map(price => (
            <tr key={price.date}>
              <td>{price.date}</td>
              <td>{price.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StockPrices;
