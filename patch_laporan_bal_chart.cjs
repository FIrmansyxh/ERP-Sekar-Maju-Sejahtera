const fs = require('fs');
const file = 'src/components/laporan/LaporanBalView.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `                        <div className="pt-1 border-t border-gray-100 text-[11px] text-right font-mono font-bold text-[#b81d24]">
                          Rp {Math.round(gb.totalNilai).toLocaleString('id-ID')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>`;

const replaceStr = `                        <div className="pt-1 border-t border-gray-100 text-[11px] text-right font-mono font-bold text-[#b81d24]">
                          Rp {Math.round(gb.totalNilai).toLocaleString('id-ID')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Visualisasi Distribusi Grade */}
                <div className="mt-6 border border-gray-200 rounded-sm p-4 bg-[#f8f9fa] shadow-2xs">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4 text-center">
                    Distribusi Jumlah Bal Berdasarkan Grade
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeBreakdown} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="grade" 
                          tick={{ fontSize: 11, fontWeight: 'bold' }} 
                          tickLine={false}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          allowDecimals={false}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                          formatter={(value) => [\`\${value} Bal\`, 'Jumlah Bal']}
                          labelFormatter={(label) => \`Grade \${label}\`}
                        />
                        <Bar 
                          dataKey="balCount" 
                          name="Jumlah Bal" 
                          radius={[4, 4, 0, 0]}
                          barSize={40}
                        >
                          {gradeBreakdown.map((entry, index) => (
                            <Cell key={\`cell-\${index}\`} fill="#b81d24" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync(file, code);
