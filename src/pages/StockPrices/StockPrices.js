import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';
import * as tf from '@tensorflow/tfjs';
import { SMA, RSI, MACD, BollingerBands } from 'technicalindicators';
import { createModel, trainModel, evaluateModel, makePredictions } from '../../models/predictionModel'; 

const apiKey = process.env.API_KEY;
const symbol = 'SPY'; // symbol for S&P 500 Inc.

function StockPrices() {
  const [prices, setPrices] = useState([]);
  const [chartInitialized, setChartInitialized] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    // fetch daily adjusted stock prices for SPY for the past year
    axios
      .get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`)
      .then((response) => {
        // extract the data from the response object
        const data = response.data['Time Series (Daily)'];

        // convert data to an array of objects
        const prices = [];
        const closePrices = [];
        const volume = [];
        for (const date in data) {
          const closePrice = parseFloat(data[date]['4. close']);
          const volumeValue = parseFloat(data[date]['6. volume']);
          prices.push({
            date: date,
            price: closePrice,
          });
          closePrices.push(closePrice);
          volume.push(volumeValue);
        }

        const movingAveragePeriod = 20; // Define the period for the moving average
        const rsiPeriod = 14; // Define the period for RSI calculation
        const macdPeriod = 12; // Define the period for MACD calculation
        const signalPeriod = 9; // Define the period for MACD signal calculation
        const bollingerBandsPeriod = 20; // Define the period for Bollinger Bands calculation
        const standardDeviations = 2; // Define the standard deviations for Bollinger Bands

        const sma = SMA.calculate({ period: movingAveragePeriod, values: closePrices });
        const rsi = RSI.calculate({ period: rsiPeriod, values: closePrices });
        const macd = MACD.calculate({ fastPeriod: macdPeriod, slowPeriod: 26, signalPeriod, values: closePrices });
        const bollingerBands = BollingerBands.calculate({
          period: bollingerBandsPeriod,
          stdDev: standardDeviations,
          values: closePrices,
        });

        const pricesWithIndicators = prices.map((price, index) => ({
          ...price,
          sma: sma[index],
          rsi: rsi[index],
          macd: macd[index],
          bollingerBands: bollingerBands[index],
        }));

        // Preprocess the data for input into the prediction model
        const processedData = preprocessData(pricesWithIndicators);

        setPrices(processedData.reverse());
      })
      .catch((error) => {
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
          labels: prices.map((price) => price.date),
          datasets: [
            {
              label: 'Closing Price',
              data: prices.map((price) => price.price),
              borderColor: 'blue',
              fill: false,
            },
          ],
        },
        plugins: {
          // options for plugins, such as tooltips and legends
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
      setChartInitialized(true);
    }
  }, [prices, chartInitialized]);

  // Preprocess the data for input into the prediction model
  const preprocessData = (data) => {
    // Extract the necessary features from the data
    const inputFeatures = data.map((price) => [
      price.sma,
      price.rsi,
      price.macd.histogram,
      price.bollingerBands.lower,
      price.bollingerBands.upper,
    ]);

    // Extract the target variable (next day's price)
    const outputLabels = data.map((price, index) => {
      if (index < data.length - 1) {
        return [data[index + 1].price];
      } else {
        return [null];
      }
    });

    // Normalize the input features (e.g., using Min-Max scaling)
    const normalizedInputFeatures = normalizeData(inputFeatures);

    // Return the preprocessed data
    return {
      inputFeatures: normalizedInputFeatures,
      outputLabels,
    };
  };

  // Normalize the data using Min-Max scaling
  const normalizeData = (data) => {
    const min = Math.min(...data.flat());
    const max = Math.max(...data.flat());
    const normalizedData = data.map((row) => row.map((value) => (value - min) / (max - min)));
    return normalizedData;
  };

  // Make predictions using the model
  const makePredictions = async () => {
    // Prepare the input data for prediction
    const inputTensor = tf.tensor2d(prices.map((price) => price.inputFeatures));
    const reshapedInput = inputTensor.reshape([inputTensor.shape[0], 1, inputTensor.shape[1]]);

    // Load the trained model from predictionModel.js
    const model = await tf.loadLayersModel('path_to_your_trained_model/model.json');

    // Make predictions
    const predictions = model.predict(reshapedInput).dataSync();

    // Perform any further processing or rendering based on the predictions
    // ...

    // Dispose of the tensors to free up memory
    inputTensor.dispose();
    reshapedInput.dispose();
    model.dispose();
  };

  return (
    <div className="main">
      <h1>Historical Stock Prices for {symbol}</h1>
      <div>
        <canvas id="chart" ref={chartRef} style={{ height: '600px', width: '100%' }} />
      </div>
      <button onClick={makePredictions}>Make Prediction</button>
    </div>
  );
}

export default StockPrices;
