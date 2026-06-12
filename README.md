# JS Visualizer Basics
> JavaScript Visualizer Basics Tool
---
# Code Examples
---
# 🧠 1–5: Mixed Basics

### 1

```js id="m1"
let a = 10;
let b = 20;
let c = a + b;

if (c > 25) {
  console.log("Big Sum");
} else {
  console.log("Small Sum");
}
```

### 2

```js id="m2"
let name = "JS";
let version = 1;

for (let i = 0; i < 3; i++) {
  console.log(name + version);
  version++;
}
```

### 3

```js id="m3"
let x = 5;
let y = 10;
let z = x * y;

console.log(z);

if (z > 40) {
  console.log("High");
}
```

### 4

```js id="m4"
let count = 0;

while (count < 5) {
  count++;
}

console.log(count);
```

### 5

```js id="m5"
let isReady = true;

if (isReady) {
  console.log("Ready");
}
```

---

# 📦 6–10: Arrays + Logic

### 6

```js id="m6"
let arr = [1, 2, 3, 4];
let sum = 0;

for (let i = 0; i < arr.length; i++) {
  sum += arr[i];
}

console.log(sum);
```

### 7

```js id="m7"
let arr = [];

for (let i = 0; i < 5; i++) {
  arr.push(i * 2);
}

console.log(arr);
```

### 8

```js id="m8"
let arr = [10, 20, 30];

arr[1] = 99;

for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]);
}
```

### 9

```js id="m9"
let arr = [3, 6, 9, 12];
let max = arr[0];

for (let i = 1; i < arr.length; i++) {
  if (arr[i] > max) {
    max = arr[i];
  }
}

console.log(max);
```

### 10

```js id="m10"
let arr = [1, 2, 3];
arr.push(4);
arr.pop();

console.log(arr);
```

---

# 🧮 11–15: 2D Arrays

### 11

```js id="m11"
let matrix = [
  [1, 2],
  [3, 4]
];

for (let i = 0; i < matrix.length; i++) {
  for (let j = 0; j < matrix[i].length; j++) {
    console.log(matrix[i][j]);
  }
}
```

### 12

```js id="m12"
let matrix = [
  [1, 2],
  [3, 4]
];

matrix[0][1] = 99;
console.log(matrix);
```

### 13

```js id="m13"
let m = [
  [2, 4],
  [6, 8]
];

let sum = 0;

for (let i = 0; i < m.length; i++) {
  for (let j = 0; j < m[i].length; j++) {
    sum += m[i][j];
  }
}

console.log(sum);
```

### 14

```js id="m14"
let m = [];

for (let i = 0; i < 3; i++) {
  m[i] = [];
  for (let j = 0; j < 3; j++) {
    m[i][j] = i + j;
  }
}

console.log(m);
```

### 15

```js id="m15"
let m = [
  [5, 1],
  [7, 3]
];

let max = m[0][0];

for (let i = 0; i < m.length; i++) {
  for (let j = 0; j < m[i].length; j++) {
    if (m[i][j] > max) {
      max = m[i][j];
    }
  }
}

console.log(max);
```

---

# 🧾 16–20: Objects + Heap

### 16

```js id="m16"
let user = {
  name: "Rahim",
  age: 20
};

user.age += 5;
console.log(user);
```

### 17

```js id="m17"
let car = {
  brand: "Toyota",
  year: 2020
};

car.year = 2025;

console.log(car.brand, car.year);
```

### 18

```js id="m18"
let obj = {};

for (let i = 0; i < 3; i++) {
  obj["key" + i] = i * 10;
}

console.log(obj);
```

### 19

```js id="m19"
let person = {
  name: "Ali",
  address: {
    city: "Dhaka",
    zip: 1212
  }
};

console.log(person.address.city);
```

### 20

```js id="m20"
let student = {
  name: "A",
  marks: [80, 90, 85]
};

console.log(student.marks[1]);
```

---

# 🔁 21–30: Loops + Conditions

### 21

```js id="m21"
let sum = 0;

for (let i = 1; i <= 10; i++) {
  if (i % 2 === 0) {
    sum += i;
  }
}

console.log(sum);
```

### 22

```js id="m22"
for (let i = 0; i < 5; i++) {
  if (i === 3) {
    console.log("Stop at 3");
  }
}
```

### 23

```js id="m23"
let i = 0;

while (i < 5) {
  if (i === 2) {
    console.log("Two");
  }
  i++;
}
```

### 24

```js id="m24"
for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    console.log(i * j);
  }
}
```

### 25

```js id="m25"
let count = 0;

for (let i = 0; i < 10; i++) {
  if (i % 3 === 0) {
    count++;
  }
}

console.log(count);
```

### 26

```js id="m26"
let i = 1;
while (i <= 5) {
  console.log(i);
  i++;
}
```

### 27

```js id="m27"
for (let i = 10; i > 0; i--) {
  if (i === 5) {
    console.log("Mid");
  }
}
```

### 28

```js id="m28"
let sum = 0;

for (let i = 1; i <= 5; i++) {
  sum += i;
}

if (sum > 10) {
  console.log("Large");
}
```

### 29

```js id="m29"
for (let i = 0; i < 6; i++) {
  if (i % 2 === 0) {
    console.log("Even", i);
  }
}
```

### 30

```js id="m30"
let x = 0;

while (x < 3) {
  x++;
  console.log(x);
}
```

---

# ⚙️ 31–40: Functions (Stack Testing)

### 31

```js id="m31"
function add(a, b) {
  return a + b;
}

console.log(add(5, 10));
```

### 32

```js id="m32"
function square(x) {
  return x * x;
}

console.log(square(6));
```

### 33

```js id="m33"
function sum(n) {
  let s = 0;

  for (let i = 0; i <= n; i++) {
    s += i;
  }

  return s;
}

console.log(sum(5));
```

### 34

```js id="m34"
function fact(n) {
  let f = 1;

  for (let i = 1; i <= n; i++) {
    f *= i;
  }

  return f;
}

console.log(fact(4));
```

### 35

```js id="m35"
function greet(name) {
  return "Hello " + name;
}

console.log(greet("JS"));
```

### 36

```js id="m36"
function max(a, b) {
  if (a > b) return a;
  return b;
}

console.log(max(10, 20));
```

### 37

```js id="m37"
function loop(n) {
  for (let i = 0; i < n; i++) {
    console.log(i);
  }
}

loop(3);
```

### 38

```js id="m38"
function calc(a, b) {
  let sum = a + b;
  let mul = a * b;

  console.log(sum, mul);
}

calc(3, 4);
```

### 39

```js id="m39"
function test(n) {
  if (n > 5) {
    return "Big";
  }
  return "Small";
}

console.log(test(7));
```

### 40

```js id="m40"
function counter() {
  let c = 0;

  for (let i = 0; i < 3; i++) {
    c++;
  }

  return c;
}

console.log(counter());
```

---

# 🚀 41–50: Full Mixed Programs (REAL ENGINE STRESS TEST)

### 41

```js id="m41"
let arr = [1, 2, 3];
let sum = 0;

for (let i = 0; i < arr.length; i++) {
  sum += arr[i];
}

if (sum > 5) {
  console.log("OK");
}
```

### 42

```js id="m42"
let matrix = [[1,2],[3,4]];
let total = 0;

for (let i = 0; i < matrix.length; i++) {
  for (let j = 0; j < matrix[i].length; j++) {
    total += matrix[i][j];
  }
}

console.log(total);
```

### 43

```js id="m43"
let obj = { a: 1, b: 2 };
obj.c = obj.a + obj.b;

console.log(obj);
```

### 44

```js id="m44"
function process(arr) {
  let sum = 0;

  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }

  return sum;
}

console.log(process([1,2,3]));
```

### 45

```js id="m45"
let arr = [];

for (let i = 1; i <= 5; i++) {
  arr.push(i * i);
}

console.log(arr);
```

### 46

```js id="m46"
let x = 1;

for (let i = 0; i < 4; i++) {
  x = x * 2;
}

console.log(x);
```

### 47

```js id="m47"
function nested(a) {
  function inner(b) {
    return b + 2;
  }

  return inner(a);
}

console.log(nested(5));
```

### 48

```js id="m48"
let arr = [1,2,3,4];
let even = [];

for (let i = 0; i < arr.length; i++) {
  if (arr[i] % 2 === 0) {
    even.push(arr[i]);
  }
}

console.log(even);
```

### 49

```js id="m49"
let obj = {
  name: "X",
  score: 0
};

for (let i = 0; i < 3; i++) {
  obj.score += i;
}

console.log(obj);
```

### 50

```js id="m50"
function complex(n) {
  let sum = 0;

  for (let i = 1; i <= n; i++) {
    if (i % 2 === 0) {
      sum += i;
    }
  }

  return sum;
}

console.log(complex(10));
```
### 51

```js id="m50"
function fact(n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}

console.log(fact(5));
```

### 52

```js id="m50"
function fib(n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

for (let i = 0; i < 10; i++) {
    if (i >= 0) {
        console.log(fib(i));
    }
}
```
