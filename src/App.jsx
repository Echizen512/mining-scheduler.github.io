import React, { useState, useEffect } from "react";
import { useScheduler } from "./useScheduler";
import { motion, AnimatePresence } from "framer-motion";

function App() {
  const { schedule, stats, calculateSchedule } = useScheduler();
  const [config, setConfig] = useState({
    workDays: 14,
    restDays: 7,
    inductionDays: 5,
    totalDays: 30,
  });

  useEffect(() => {
    calculateSchedule(config);
  }, [calculateSchedule]);

  const handleCalculate = (e) => {
    e.preventDefault();
    calculateSchedule(config);
  };

  const handleChange = (e) => {
    setConfig({
      ...config,
      [e.target.name]: parseInt(e.target.value) || 0,
    });
  };

  const getColorClass = (status) => {
    switch (status) {
      case "S":
        return "bg-indigo-500 text-white shadow-sm";
      case "I":
        return "bg-amber-400 text-amber-950 shadow-sm";
      case "P":
        return "bg-emerald-500 text-white shadow-sm font-bold";
      case "B":
        return "bg-rose-500 text-white shadow-sm";
      case "D":
        return "bg-slate-200 text-slate-500";
      default:
        return "bg-transparent text-transparent border-none";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-12 font-sans antialiased text-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-full mx-auto"
      >
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Mining<span className="text-indigo-600">Scheduler</span>
            </h1>
            <p className="text-slate-500 font-medium mt-2">
              Control de cobertura y optimización de relevos
            </p>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8 transition-all hover:shadow-2xl">
          <form
            onSubmit={handleCalculate}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end"
          >
            <InputField
              label="Días Trabajo (N)"
              name="workDays"
              value={config.workDays}
              onChange={handleChange}
            />
            <InputField
              label="Días Descanso (M)"
              name="restDays"
              value={config.restDays}
              onChange={handleChange}
            />
            <InputField
              label="Inducción"
              name="inductionDays"
              value={config.inductionDays}
              onChange={handleChange}
            />
            <InputField
              label="Perforación (Días)"
              name="totalDays"
              value={config.totalDays}
              onChange={handleChange}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="h-11 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center"
            >
              Calcular Relevos
            </motion.button>
          </form>
        </section>

        <AnimatePresence>
          {stats.errors.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
                <div className="flex items-center gap-2 text-rose-800 font-bold mb-1">
                  <span className="text-xl">⚠️</span> Alertas de Seguridad
                  Social
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-rose-600 text-sm italic">
                  {stats.errors.slice(0, 3).map((err, idx) => (
                    <span key={idx}>
                      • Día {err.day}: {err.msg}
                    </span>
                  ))}
                  {stats.errors.length > 3 && (
                    <span>...y {stats.errors.length - 3} más</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="sticky left-0 z-20 bg-slate-900 p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 w-20">
                      ID
                    </th>
                    {schedule.days.map((d) => (
                      <th
                        key={d.day}
                        className={`p-2 text-center text-[10px] font-bold border-b border-slate-800 ${
                          d.hasError
                            ? "text-rose-400 bg-rose-950/30"
                            : "text-slate-500"
                        }`}
                      >
                        {String(d.day).padStart(2, "0")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["s1", "s2", "s3"].map((sv, idx) => (
                    <tr
                      key={sv}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                    >
                      <td className="sticky left-0 z-20 p-4 font-black text-slate-700 bg-inherit border-r border-slate-100 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] uppercase tracking-tighter">
                        {sv}
                      </td>
                      {schedule.days.map((d, i) => (
                        <td key={i} className="p-1 border-b border-slate-100">
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className={`h-9 w-full flex items-center justify-center rounded-lg text-xs font-bold transition-all hover:brightness-110 cursor-default ${getColorClass(
                              d[sv]
                            )}`}
                          >
                            {d[sv] !== "-" ? d[sv] : ""}
                          </motion.div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-slate-100/50">
                    <td className="sticky left-0 z-20 p-4 font-bold text-slate-500 bg-[#f1f5f9] border-r border-slate-200 uppercase text-xs">
                      Capacidad
                    </td>
                    {schedule.days.map((d, i) => {
                      const isError = d.pCount !== 2 && d.s3 !== "-";
                      return (
                        <td
                          key={i}
                          className={`p-1 text-center font-black ${
                            isError
                              ? "text-rose-600 bg-rose-100/50"
                              : "text-slate-400"
                          }`}
                        >
                          {d.pCount}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="mt-8 flex flex-wrap justify-center gap-8 py-6 border-t border-slate-200">
          <LegendItem color="bg-indigo-500" label="S" full="Subida" />
          <LegendItem color="bg-amber-400" label="I" full="Inducción" />
          <LegendItem color="bg-emerald-500" label="P" full="Perforación" />
          <LegendItem color="bg-rose-500" label="B" full="Bajada" />
          <LegendItem color="bg-slate-200" label="D" full="Descanso" />
        </footer>
      </motion.div>
    </div>
  );
}

function InputField({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">
        {label}
      </label>
      <input
        {...props}
        type="number"
        className="h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700"
      />
    </div>
  );
}

function LegendItem({ color, label, full }) {
  return (
    <div className="flex items-center gap-2 group cursor-help">
      <div
        className={`w-6 h-6 rounded-md ${color} flex items-center justify-center text-[10px] font-bold text-white shadow-sm group-hover:scale-110 transition-transform`}
      >
        {label}
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
        {full}
      </span>
    </div>
  );
}

export default App;
