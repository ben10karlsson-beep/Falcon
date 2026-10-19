/* The representative BTN vs BB flops to solve, grouped by texture.
   Each family is one idea a player should learn; together they cover the common board types. */
module.exports = [
  // Ace-high: BTN has far more strong aces than BB
  { board: "As,7d,2c", family: "Ace-high dry" },
  { board: "As,Kd,6c", family: "Ace-high broadway" },
  { board: "As,Jd,Tc", family: "Ace-high connected" },
  { board: "As,5d,4c", family: "Ace-high wheel" },
  { board: "As,9s,4d", family: "Ace-high two-tone" },
  // King-high
  { board: "Ks,7d,2c", family: "King-high dry" },
  { board: "Ks,Qd,7c", family: "King-high broadway" },
  { board: "Ks,Td,8c", family: "King-high connected" },
  { board: "Ks,9s,5d", family: "King-high two-tone" },
  // Queen-high
  { board: "Qs,8d,3c", family: "Queen-high dry" },
  { board: "Qs,Jd,9c", family: "Queen-high connected" },
  { board: "Qs,7s,2d", family: "Queen-high two-tone" },
  // Jack- and ten-high
  { board: "Jh,6d,2c", family: "Jack-high dry" },
  { board: "Js,Td,8c", family: "Jack-high connected" },
  { board: "Ts,9s,6d", family: "Ten-high wet" },
  { board: "Td,7c,4h", family: "Ten-high dry" },
  { board: "Th,6d,3c", family: "Ten-high low" },
  // Middle and low: BB's calling range hits these much more
  { board: "9s,7d,3c", family: "Middle dry" },
  { board: "8s,7d,6c", family: "Middle connected" },
  { board: "8s,7s,5d", family: "Middle two-tone" },
  { board: "6s,4d,2c", family: "Low dry" },
  { board: "5s,4s,3d", family: "Low connected two-tone" },
  // Paired
  { board: "As,Ad,8c", family: "Paired aces" },
  { board: "Ks,Kd,5c", family: "Paired high" },
  { board: "Jh,Jd,7h", family: "Paired two-tone" },
  { board: "8s,8d,3c", family: "Paired middle" },
  { board: "4s,4d,9c", family: "Paired low" },
  // Monotone
  { board: "Ah,9h,5h", family: "Monotone ace-high" },
  { board: "Qh,8h,3h", family: "Monotone high" },
  { board: "9h,7h,4h", family: "Monotone middle" },
  // Second batch (2026-10-19): fills texture gaps between the first 30
  { board: "As,Qd,3c", family: "Ace-queen dry" },
  { board: "As,Kd,Qc", family: "Ace-high three broadway" },
  { board: "Ks,Qs,Jd", family: "King-high broadway two-tone" },
  { board: "Ks,Jd,4c", family: "King-jack dry" },
  { board: "Qs,Td,4c", family: "Queen-ten dry" },
  { board: "Qs,6d,5c", family: "Queen-high low connected" },
  { board: "Js,9s,4d", family: "Jack-high two-tone" },
  { board: "Js,8d,5c", family: "Jack-high middle" },
  { board: "Ts,8s,2d", family: "Ten-high two-tone" },
  { board: "9s,8d,5c", family: "Nine-high connected" },
  { board: "7s,6s,3d", family: "Seven-high two-tone" },
  { board: "7s,5d,2c", family: "Seven-high dry" },
  { board: "Qs,Qd,6c", family: "Paired queens" },
  { board: "Ts,Td,4c", family: "Paired tens" },
  { board: "7s,7d,2s", family: "Paired low two-tone" },
  { board: "As,5d,5c", family: "Paired low with an ace" },
  { board: "Kh,Th,6h", family: "Monotone king-high" },
  { board: "6h,5h,2h", family: "Monotone low" }
];
