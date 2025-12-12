class Vehicle {
    constructor(make, model, year) {
        this.make = make;
        this.model = model;
        this.year = year;
        this.isRunning = false;
    }

    start() {
        this.isRunning = true;
        console.log(`${this.year} ${this.make} ${this.model} is now running.`);
    }

    stop() {
        this.isRunning = false;
        console.log(`${this.year} ${this.make} ${this.model} is now off.`);
    }

    getAge(currentYear) {
        return currentYear - this.year;
    }
}

// Example usage
const myCar = new Vehicle('Toyota', 'Camry', 2022);
myCar.start(); // Output: "2022 Toyota Camry is now running."
console.log(`Vehicle age: ${myCar.getAge(2025)} years`); // Output: "Vehicle age: 3 years"