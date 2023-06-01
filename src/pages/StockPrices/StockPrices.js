import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';

const apiKey = process.env.API_KEY; 
const symbol = 'SPY'; // symbol for S&P 500 Inc.

function StockPrices() {
  const [prices, setPrices] = useState([]);
  const [chartInitialized, setChartInitialized] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    // fetch daily adjusted stock prices for TSLA for the past year
    axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`)
      .then(response => {
        // extract the data from the response object
        const data = response.data['Time Series (Daily)'];

        // convert data to an array of objects
        const prices = [];
        for (const date in data) {
          prices.push({
            date: date,
            price: parseFloat(data[date]['4. close'])
          });
        }

        setPrices(prices.reverse()); // reverse the order of the prices array
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    // create a line chart using Chart.js
    Chart.register(...registerables);
    const ctx = chartRef.current.getContext('2d');
    if (!chartInitialized && prices.length > 0) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: prices.map(price => price.date), // reverse the order of the labels
          datasets: [{
            label: 'Closing Price',
            data: prices.map(price => price.price), // reverse the order of the data
            borderColor: 'blue',
            fill: false
          }]
        },
        plugins: {
          // options for plugins, such as tooltips and legends
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      setChartInitialized(true);
    }
  }, [prices, chartInitialized]);

  // Make a basic prediction on whether the price will go up or down
  const makePrediction = () => {
    if (prices.length < 2) {
      return 'Insufficient data';
    }

    const currentPrice = prices[prices.length - 1].price;
    const previousPrice = prices[prices.length - 2].price;

    if (currentPrice > previousPrice) {
      return 'Price will go up';
    } else {
      return 'Price will go down';
    }
  };

  return (
    <div className="main">
      <h1>Historical Stock Prices for {symbol}</h1>
      <div>
        <canvas id="chart" ref={chartRef} style={{ height: '600px', width: '70%' }} />
      </div>
      <button onClick={makePrediction}>Make Prediction</button>
    </div>
  );
}

export default StockPrices;