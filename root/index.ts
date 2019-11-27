import fs, { ReadStream } from 'fs';
import readline from 'readline';

const alfa = 0.4;
const beta = 0.6;
const antCapacity = 100;
const ro = 0.05;
const numberOfAnts = 300;
const numberOfIterations = 100;

let start = 0;
let end = 0;
if (process.argv) {
    start = parseInt(process.argv.slice(2)[0]);
    end = parseInt(process.argv.slice(2)[1]);
}

console.log(start, end);

interface AntInterface {
    path: Array<number>;
    totalWay: number;
    cantFindWay: boolean;
    go(
        startPoint: number,
        endPoint: number,
        weightMatrix: Array<Array<number>>,
        pheromonesMatrix: Array<Array<number>>,
    ): void;
    pheromonesOut(pheromonesMatrix: Array<Array<number>>): void;
}

class Ant implements AntInterface {
    path: Array<number> = [];
    totalWay = 0;
    cantFindWay = false;
    constructor() {
        this.path = [];
        this.totalWay = 0;
        this.cantFindWay = false;
    }

    go(
        startPoint: number,
        endPoint: number,
        weightMatrix: Array<Array<number>>,
        pheromonesMatrix: Array<Array<number>>,
    ): void {
        let currentPoint: number = startPoint;
        this.path.push(currentPoint);
        while (currentPoint !== endPoint) {
            let balanceSum = 0;
            for (let i = 0; i < weightMatrix.length; i++) {
                if (weightMatrix[currentPoint][i] === 0 || this.path.includes(i)) continue;
                balanceSum +=
                    Math.pow(pheromonesMatrix[currentPoint][i], alfa) *
                    Math.pow(1 / weightMatrix[currentPoint][i], beta);
            }
            if (balanceSum === 0) {
                this.cantFindWay = true;
                console.log('cant find way');
                break;
            }

            for (let i = 0; i < weightMatrix.length; i++) {
                if (weightMatrix[currentPoint][i] === 0 || this.path.includes(i)) continue;
                const probabilityToMove: number =
                    (Math.pow(pheromonesMatrix[currentPoint][i], alfa) *
                        Math.pow(1 / weightMatrix[currentPoint][i], beta)) /
                    balanceSum;
                if (isNaN(probabilityToMove)) {
                    console.log(pheromonesMatrix, weightMatrix);
                    throw new Error('NaN');
                }
                if (Math.random() < probabilityToMove) {
                    this.path.push(i);
                    this.totalWay += weightMatrix[currentPoint][i];
                    currentPoint = i;
                    break;
                }
            }
        }
    }

    pheromonesOut(pheromonesMatrix: Array<Array<number>>): void {
        if (!this.cantFindWay) {
            for (let i = 0; i < this.path.length - 1; i++) {
                pheromonesMatrix[this.path[i]][this.path[i + 1]] += antCapacity / this.totalWay;
            }
        }
        this.totalWay = 0;
        this.path = [];
    }
}

function vaporizePheromones(pheromonesMatrix: Array<Array<number>>): void {
    for (let i = 0; i < pheromonesMatrix.length; i++) {
        for (let j = 0; j < pheromonesMatrix.length; j++) {
            pheromonesMatrix[i][j] *= 1 - ro;
        }
    }
}

function antsAlg(weightMatrix: Array<Array<number>>): Array<number> {
    let answer: Array<number> = [];
    const pheromonesMatrix: Array<Array<number>> = Array(weightMatrix.length)
        .fill(0)
        .map(() => Array(weightMatrix.length).fill(1));
    const ants: Array<Ant> = Array(numberOfAnts)
        .fill(0)
        .map(() => new Ant());
    for (let i = 0; i < numberOfIterations; i++) {
        let minTotalWay = Infinity;
        vaporizePheromones(pheromonesMatrix);
        for (const ant of ants) {
            ant.go(start, end, weightMatrix, pheromonesMatrix);
            if (ant.totalWay < minTotalWay) {
                minTotalWay = ant.totalWay;
                answer = Array.from(ant.path);
            }
        }
        for (const ant of ants) {
            ant.pheromonesOut(pheromonesMatrix);
        }
    }
    return answer;
}

async function createWeightTableFromFile(fileName: string): Promise<Array<Array<number>>> {
    const readStream: ReadStream = fs.createReadStream(fileName);

    const r1 = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity,
    });
    const answer: Array<Array<number>> = [];

    for await (const line of r1) {
        answer.push(line.split(' ').map(el => +el));
    }
    for (const line of answer) {
        if (line.length !== answer.length) throw new Error('Invalid input, file is not NxN matrix');
    }
    return answer;
}

createWeightTableFromFile('matrix.txt').then(weightMatrix => {
    const answer: Array<number> = antsAlg(weightMatrix);
    let wayWeight = 0;
    for (let i = 0; i < answer.length - 1; i++) {
        wayWeight += weightMatrix[answer[i]][answer[i + 1]];
    }
    console.log(answer, wayWeight);
});
