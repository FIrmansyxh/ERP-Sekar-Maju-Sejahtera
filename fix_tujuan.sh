sed -i '702,719c\
              <input\
                type="text"\
                placeholder="Tulis tujuan pabrik penerima"\
                value={tujuanBuyer}\
                onChange={(e) => setTujuanBuyer(e.target.value)}\
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-xs focus:ring-1 focus:ring-gray-700"\
              />' src/components/sample/SampleManagement.tsx
