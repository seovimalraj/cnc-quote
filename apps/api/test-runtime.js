require('reflect-metadata');
console.log('Testing decorator compilation...');

const { Injectable } = require('@nestjs/common');

function TestDecorator() {
  console.log('Decorator created successfully');
  return function(target) {
    console.log('Decorator applied to:', target.name);
    return target;
  };
}

@TestDecorator()
class TestClass {
  test() {
    return 'success';
  }
}

console.log('Test completed - decorators working');
