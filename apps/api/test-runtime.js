require('reflect-metadata');

const { Injectable } = require('@nestjs/common');

function TestDecorator() {
  return function(target) {
    return target;
  };
}

@TestDecorator()
class TestClass {
  test() {
    return 'success';
  }
}
