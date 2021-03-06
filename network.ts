/**
 * Reference: http://neuralnetworksanddeeplearning.com
 */

import { Matrix } from 'https://deno.land/x/math/mod.ts';
import {
  createRandomRealMatrix,
  createZerosMatrix,
  sigmoid,
  sigmoidPrime,
  operateOnMatrix,
  addMatrixArrays,
  shuffle,
  createMiniBatches,
  printResults,
} from './utility.ts';

export class Network {
  private layer_sizes: number[] = [];
  private biases: Matrix[] = [];
  private weights: Matrix[] = [];

  constructor(layer_sizes: number[]) {
    if (layer_sizes.length < 3) {
      throw new Error(`Please create a network with at least 3 layers!`);
    }

    this.layer_sizes = layer_sizes;

    // Create weight and bias matrices
    for (let i = 1; i < layer_sizes.length; i++) {
      const dim1 = layer_sizes[i];
      const dim2 = layer_sizes[i - 1];

      this.weights[i - 1] = createRandomRealMatrix(dim1, dim2);
      this.biases[i - 1] = createRandomRealMatrix(dim1, 1);
    }
  }

  /**
   * Return the output of the network when `inputs` are fed
   */
  public feedforward(inputs: number[]) {
    // Ensure input matches input layer size
    if (inputs.length !== this.layer_sizes[0]) {
      throw new Error(
        `Dimension of input not equal to value expected by network!`
      );
    }

    // Forward propagation
    let res: any = new Matrix([inputs]).transpose();
    for (let i = 0; i < this.weights.length; i++) {
      const weightMatrix = this.weights[i];
      const biasMatrix = this.biases[i];
      res = weightMatrix.times(res).plus(biasMatrix);
      const [rowSize, colSize] = res.shape;

      for (let j = 0; j < rowSize; j++) {
        for (let k = 0; k < colSize; k++) {
          res.matrix[j][k] = sigmoid(res.matrix[j][k]);
        }
      }
    }

    return res.transpose().matrix;
  }

  public train(X_train: Matrix, y_train: Matrix, epochs: number, lr: number, verbose = false) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle X_train, y_train after every epoch
      const ArrayX_Y = shuffle(X_train, y_train);
      let miniBatchesX = createMiniBatches(ArrayX_Y[0], 10);
      let miniBatchesY = createMiniBatches(ArrayX_Y[1], 10);
      
      for (let index = 0; index < miniBatchesX.length; index++) {
        const miniBatchX = miniBatchesX[index];
        const miniBatchY = miniBatchesY[index]
        this.update_mini_batch(miniBatchX, miniBatchY, lr)
      }
      if (verbose && epoch % 25000 === 0) {
        console.log(`Epoch ${epoch}:`)
        printResults(X_train, this)
        console.log()
      }
      
    }
  }

  public backprop(x: Matrix, y: Matrix, layer_sizes: number[], weightMatrix: Matrix[], biasMatrix: Matrix[]) {
    if (x.shape[1] !== layer_sizes[0]) {
      throw new Error(
        `Input should have ${layer_sizes[0]} features, ${x.shape[1]} features passed!`
      );
    }
    if (y.shape[1] !== layer_sizes[layer_sizes.length - 1]) {
      throw new Error(
        `Output should have ${
          layer_sizes[layer_sizes.length - 1]
        } labels, ${y.shape[1]} features passed!`
      );
    }

    const grad_w: Matrix[] = [];
    const grad_b: Matrix[] = [];

    let activation = x;
    let z = new Matrix([[]]);
    const activations = [x];
    const zVectors = [];

    for (let i = 0; i < weightMatrix.length; i++) {
      const weights = weightMatrix[i];
      const biases = biasMatrix[i];

      z = weights.times(activation.transpose()).plus(biases);
      zVectors.push(z);
      activation = operateOnMatrix(z, sigmoid).transpose();
      activations.push(activation);
    }

    let db = activation
      .minus(y)
      .transpose()
      .times(operateOnMatrix(z, sigmoidPrime));

    grad_b.unshift(db);

    const partialDerivativeWeights = db.times(
      activations[activations.length - 2]
    );

    grad_w.unshift(partialDerivativeWeights);

    for (let i = weightMatrix.length - 2; i >= 0; i--) {
      z = zVectors[i];
      const zSigmoidPrime = operateOnMatrix(z, sigmoidPrime);

      db = weightMatrix[i + 1].transpose().times(db).times(zSigmoidPrime);
      grad_b.unshift(db);

      const dw = db.times(activations[i]);
      grad_w.unshift(dw);
    }

    return [grad_w, grad_b];
  }

  public update_mini_batch(X: Matrix, y: Matrix, lr: number): void {
    let weightUpdates: Matrix[] = [];
    let biasUpdates: Matrix[] = [];

    for (let i = 0; i < this.weights.length; i++) {
      weightUpdates.push(createZerosMatrix(...this.weights[i].shape));
      biasUpdates.push(createZerosMatrix(...this.biases[i].shape));
    }

    for (let i = 0; i < X.matrix.length; i++) {
      const inputs = X.row(i);
      const outputs = y.row(i);

      const [dw, db] = this.backprop(
        new Matrix([inputs]),
        new Matrix([outputs]),
        this.layer_sizes,
        this.weights,
        this.biases
      );

      weightUpdates = addMatrixArrays(weightUpdates, dw);
      biasUpdates = addMatrixArrays(biasUpdates, db);
    }

    // Update weights
    for (let i = 0; i < this.weights.length; i++) {
      const currentWeights = this.weights[i];
      const deltaWeights = weightUpdates[i];

      this.weights[i] = currentWeights.minus(
        deltaWeights.times(lr / X.matrix.length)
      );
    }

    // Update biases
    for (let i = 0; i < this.biases.length; i++) {
      const currentBiases = this.biases[i];
      const deltaBiases = biasUpdates[i];

      this.biases[i] = currentBiases.minus(
        deltaBiases.times(lr / X.matrix.length)
      );
    }
  }
}