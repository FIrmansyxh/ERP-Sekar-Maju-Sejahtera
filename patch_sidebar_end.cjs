const fs = require('fs');
let file = 'src/components/Sidebar.tsx';
let code = fs.readFileSync(file, 'utf8');

// The corrupted block is around the end:
//         )}          
//                     </button>
//           </div>
//         )}
//       </div>
//     </aside>

code = code.replace(/        \)\}[\s\n]*<\/button>[\s\n]*<\/div>[\s\n]*\)\}[\s\n]*<\/div>[\s\n]*<\/aside>[\s\n]*\);[\s\n]*\};/g, '        )}\n      </div>\n    </aside>\n  );\n};');

fs.writeFileSync(file, code);
