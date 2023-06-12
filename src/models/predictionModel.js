import { SMA } from 'technicalindicators';
import * as tf from '@tensorflow/tfjs';

// Function to preprocess the data
export const preprocessData = (data) => {
  // Extract the necessary features from the data
  const inputFeatures = data.map((price) => [
    price.sma,
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

// Function to normalize the data using Min-Max scaling
export const normalizeData = (data) => {
  const min = Math.min(...data.flat());
  const max = Math.max(...data.flat());
  const normalizedData = data.map((row) => row.map((value) => (value - min) / (max - min)));
  return normalizedData;
};

// Function to create the machine learning model
export const createModel = (inputShape) => {
  const model = tf.sequential();
  model.add(tf.layers.lstm({ units: 50, inputShape, returnSequences: true }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.lstm({ units: 50 }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: tf.train.adam(), loss: 'meanSquaredError' });
  return model;
};

// Function to train the machine learning model
export const trainModel = async (model, XTrain, yTrain, epochs, batchSize) => {
  await model.fit(XTrain, yTrain, { epochs, batchSize });
};

// Function to evaluate the machine learning model
export const evaluateModel = (model, XTest, yTest) => {
  const evaluation = model.evaluate(XTest, yTest);
  return evaluation;
};

// Function to make predictions using the machine learning model
export const makePredictions = (model, XUnseen) => {
  const predictions = model.predict(XUnseen).dataSync();
  return predictions;
};
