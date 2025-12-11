/**
 * Example JavaScript constructor function.
 * @param {string} name - The name of the instance.
 * @param {number} id - The unique identifier.
 */
function Example(name, id) {
  this.name = name;
  this.id = id;
}

// Adding a method to the prototype
Example.prototype.describe = function() {
  return `Instance ${this.id}: ${this.name}`;
};

// Example usage:
// const obj = new Example("Sample", 1);
// console.log(obj.describe()); // Output: Instance 1: Sample