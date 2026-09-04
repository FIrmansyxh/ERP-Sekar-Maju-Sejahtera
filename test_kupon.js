const list = [{no_kupon: "KUP-099"}, {no_kupon: "101"}, {no_kupon: "KUPON-105-X"}];
let maxNum = 0;
for (const tx of list) {
    const match = tx.no_kupon.match(/\d+/);
    if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
    }
}
console.log(maxNum + 1);
