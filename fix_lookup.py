import re

with open('src/components/transaksi/TimbanganPageView.tsx', 'r') as f:
    content = f.read()

pattern = r"(      if \(!foundTx \|\| !foundItem\) \{\n        for \(const tx of transaksiList\) \{\n          const match = \(tx\.items \|\| \[\]\)\.find\(\(it\) => \{\n            const bCode = \(it\.barcode \|\| ''\)\.toLowerCase\(\);\n            const nBal = \(it\.no_bal \|\| ''\)\.toLowerCase\(\);\n            return bCode\.includes\(cleanQ\) \|\| nBal\.includes\(cleanQ\);\n          \}\);\n          if \(match\) \{\n            foundTx = tx;\n            foundItem = match;\n            break;\n          \}\n        \}\n      \}\n    \})"

replacement = r"""\1

    // Step C: If still not found, check if they typed a Kupon Number instead!
    if (!foundTx || !foundItem) {
      const matchedKupon = transaksiList.find(tx => tx.no_kupon.toLowerCase() === cleanQ || tx.no_kupon.toLowerCase().includes(cleanQ));
      if (matchedKupon) {
        // They typed a Kupon. Just change Kupon!
        handleManualChangeKupon(matchedKupon.transaksi_id);
        setScannedBarcode(''); // Clear it because it was a Kupon
        setScanFeedback({ text: `Memilih Kupon ${matchedKupon.no_kupon}...`, isError: false });
        return; // Done!
      }
    }"""

content = re.sub(pattern, replacement, content)

with open('src/components/transaksi/TimbanganPageView.tsx', 'w') as f:
    f.write(content)
