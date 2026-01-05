import { useState, useCallback } from 'react';

const TYPES = { S: 'S', I: 'I', P: 'P', B: 'B', D: 'D', NONE: '-' };

export const useScheduler = () => {
  const [schedule, setSchedule] = useState({ s1: [], s2: [], s3: [], days: [] });
  const [stats, setStats] = useState({ errors: [] });

  const calculateSchedule = useCallback((config) => {
    const { workDays, restDays, inductionDays, totalDays, priority = 'S2' } = config;
    const cycleLen = workDays + restDays;
    const drillDaysTarget = Math.max(0, workDays - 1 - inductionDays);
    const s1 = new Array(totalDays).fill(TYPES.D);
    for (let i = 0, cycleDay = 0; i < totalDays; i++, cycleDay++) {
      const cyclePos = cycleDay % cycleLen;
      if (cyclePos === 0) s1[i] = TYPES.S;
      else if (cyclePos <= inductionDays) s1[i] = TYPES.I;
      else if (cyclePos < workDays) s1[i] = TYPES.P;
      else if (cyclePos === workDays) s1[i] = TYPES.B;
      else s1[i] = TYPES.D;
    }
    const s1FirstB = workDays;
    const s3StartDay = Math.max(0, s1FirstB - inductionDays - 1);

    const makeEmpty = () => new Array(totalDays).fill(TYPES.NONE);
    const s2 = makeEmpty();
    const s3 = makeEmpty();

    const fillAgent = (arr, startDay) => {
      let state = TYPES.NONE;
      let stateDayCounter = 0;
      let daysDrilledInCycle = 0;
      for (let i = 0; i < totalDays; i++) {
        if (i < startDay) { arr[i] = TYPES.NONE; continue; }
        if (i === startDay) { state = TYPES.S; stateDayCounter = 0; daysDrilledInCycle = 0; arr[i] = state; continue; }
        arr[i] = state;
        const next = i + 1;
        if (next >= totalDays) break;
        let nextState = state;
        stateDayCounter++;
        if (state === TYPES.S) { nextState = TYPES.I; stateDayCounter = 0; }
        else if (state === TYPES.I) {
          if (stateDayCounter >= inductionDays) { nextState = TYPES.P; stateDayCounter = 0; }
        }
        else if (state === TYPES.P) {
          daysDrilledInCycle++;
          const othersDrillingTomorrow = 0;
          if (daysDrilledInCycle >= drillDaysTarget) {
            if (othersDrillingTomorrow >= 2) { nextState = TYPES.B; stateDayCounter = 0; }
            else { nextState = TYPES.P; }
          }
        }
        else if (state === TYPES.B) { nextState = TYPES.D; stateDayCounter = 0; }
        else if (state === TYPES.D) {
          const leadTime = 1 + inductionDays;
          const targetDay = next + leadTime;
          if (targetDay < totalDays) {
            const othersDrillingInFuture = 0;
            if (othersDrillingInFuture < 2) { nextState = TYPES.S; stateDayCounter = 0; daysDrilledInCycle = 0; }
            else {
              const maxRest = Math.max(0, restDays - 2);
              if (stateDayCounter >= maxRest) { nextState = TYPES.S; stateDayCounter = 0; daysDrilledInCycle = 0; }
            }
          }
        }
        state = nextState;
      }
    };

    const simulateAgentFrom = (arr, startDay, startState, other1, other2) => {
      arr[startDay] = startState;
      let state = startState;
      let stateDayCounter = 0;
      let daysDrilledInCycle = 0;
      for (let i = startDay; i < totalDays; i++) {
        if (i > startDay) arr[i] = state;
        const next = i + 1;
        if (next >= totalDays) break;
        let nextState = state;
        stateDayCounter++;
        if (state === TYPES.S) { nextState = TYPES.I; stateDayCounter = 0; }
        else if (state === TYPES.I) {
          if (stateDayCounter >= inductionDays) { nextState = TYPES.P; stateDayCounter = 0; }
        }
        else if (state === TYPES.P) {
          daysDrilledInCycle++;
          const othersDrillingTomorrow = (other1[next] === TYPES.P ? 1 : 0) + (other2[next] === TYPES.P ? 1 : 0);
          if (daysDrilledInCycle >= drillDaysTarget) {
            if (othersDrillingTomorrow >= 2) { nextState = TYPES.B; stateDayCounter = 0; }
            else { nextState = TYPES.P; }
          }
        }
        else if (state === TYPES.B) { nextState = TYPES.D; stateDayCounter = 0; }
        else if (state === TYPES.D) {
          const leadTime = 1 + inductionDays;
          const targetDay = next + leadTime;
          if (targetDay < totalDays) {
            const othersDrillingInFuture = (other1[targetDay] === TYPES.P ? 1 : 0) + (other2[targetDay] === TYPES.P ? 1 : 0);
            if (othersDrillingInFuture < 2) { nextState = TYPES.S; stateDayCounter = 0; daysDrilledInCycle = 0; }
            else {
              const maxRest = Math.max(0, restDays - 2);
              if (stateDayCounter >= maxRest) { nextState = TYPES.S; stateDayCounter = 0; daysDrilledInCycle = 0; }
            }
          }
        }
        state = nextState;
      }
    };

    const initAgent = (arr, startDay, otherA, otherB) => {
      let state = TYPES.NONE;
      let stateDayCounter = 0;
      let daysDrilledInCycle = 0;
      for (let i = 0; i < totalDays; i++) {
        if (i < startDay) { arr[i] = TYPES.NONE; continue; }
        if (i === startDay) { state = TYPES.S; stateDayCounter = 0; daysDrilledInCycle = 0; arr[i] = state; continue; }
        arr[i] = state;
        const next = i + 1;
        if (next >= totalDays) break;
        let nextState = state;
        stateDayCounter++;
        if (state === TYPES.S) { nextState = TYPES.I; stateDayCounter = 0; }
        else if (state === TYPES.I) {
          if (stateDayCounter >= inductionDays) { nextState = TYPES.P; stateDayCounter = 0; }
        }
        else if (state === TYPES.P) {
          daysDrilledInCycle++;
          const othersDrillingTomorrow = (otherA[next] === TYPES.P ? 1 : 0) + (otherB[next] === TYPES.P ? 1 : 0);
          if (daysDrilledInCycle >= drillDaysTarget) {
            if (othersDrillingTomorrow >= 2) { nextState = TYPES.B; stateDayCounter = 0; }
            else { nextState = TYPES.P; }
          }
        }
        else if (state === TYPES.B) { nextState = TYPES.D; stateDayCounter = 0; }
        else if (state === TYPES.D) {
          const leadTime = 1 + inductionDays;
          const targetDay = next + leadTime;
          if (targetDay < totalDays) {
            const othersDrillingInFuture = (otherA[targetDay] === TYPES.P ? 1 : 0) + (otherB[targetDay] === TYPES.P ? 1 : 0);
            if (othersDrillingInFuture < 2) { nextState = TYPES.S; stateDayCounter = 0; daysDrilledInCycle = 0; }
            else {
              const maxRest = Math.max(0, restDays - 2);
              if (stateDayCounter >= maxRest) { nextState = TYPES.S; stateDayCounter = 0; daysDrilledInCycle = 0; }
            }
          }
        }
        state = nextState;
      }
    };

    initAgent(s3, s3StartDay, s1, s2);
    initAgent(s2, 0, s1, s3);

    const pCountAt = (d) => {
      let c = 0;
      if (s1[d] === TYPES.P) c++;
      if (s2[d] === TYPES.P) c++;
      if (s3[d] === TYPES.P) c++;
      return c;
    };

    const setAndResimulate = (arr, day, newState, startDayForAgent, otherA, otherB) => {
      arr[day] = newState;
      simulateAgentFrom(arr, day, newState, otherA, otherB);
    };

    for (let day = 0; day < totalDays; day++) {
      let pCount = pCountAt(day);
      if (pCount > 2) {
        if (priority === 'S2') {
          if (s2[day] === TYPES.P) { setAndResimulate(s2, day, TYPES.B, 0, s1, s3); pCount = pCountAt(day); }
          if (pCount > 2 && s3[day] === TYPES.P) { setAndResimulate(s3, day, TYPES.B, s3StartDay, s1, s2); pCount = pCountAt(day); }
        } else {
          if (s3[day] === TYPES.P) { setAndResimulate(s3, day, TYPES.B, s3StartDay, s1, s2); pCount = pCountAt(day); }
          if (pCount > 2 && s2[day] === TYPES.P) { setAndResimulate(s2, day, TYPES.B, 0, s1, s3); pCount = pCountAt(day); }
        }
      }
      const s3Active = day >= s3StartDay;
      if (s3Active) {
        pCount = pCountAt(day);
        if (pCount < 2) {
          if (s2[day] !== TYPES.P && (s2[day] === TYPES.D || s2[day] === TYPES.B || s2[day] === TYPES.NONE)) {
            setAndResimulate(s2, day, TYPES.P, 0, s1, s3); pCount = pCountAt(day);
          }
          if (pCount < 2 && s3[day] !== TYPES.P && (s3[day] === TYPES.D || s3[day] === TYPES.B || s3[day] === TYPES.NONE)) {
            setAndResimulate(s3, day, TYPES.P, s3StartDay, s1, s2); pCount = pCountAt(day);
          }
          if (pCount < 2) {
            if (s2[day] === TYPES.I) { setAndResimulate(s2, day, TYPES.P, 0, s1, s3); pCount = pCountAt(day); }
            if (pCount < 2 && s3[day] === TYPES.I) { setAndResimulate(s3, day, TYPES.P, s3StartDay, s1, s2); pCount = pCountAt(day); }
          }
          if (pCount < 2) {
            const seed = Math.max(0, day - (inductionDays + 1));
            setAndResimulate(s2, seed, TYPES.S, 0, s1, s3);
            setAndResimulate(s3, seed, TYPES.S, s3StartDay, s1, s2);
            pCount = pCountAt(day);
          }
        }
      }
      if (pCountAt(day) > 2) {
        if (priority === 'S2') {
          if (s2[day] === TYPES.P) setAndResimulate(s2, day, TYPES.B, 0, s1, s3);
        } else {
          if (s3[day] === TYPES.P) setAndResimulate(s3, day, TYPES.B, s3StartDay, s1, s2);
        }
      }
    }

    const days = [];
    const errors = [];
    for (let i = 0; i < totalDays; i++) {
      let pCount = 0;
      if (s1[i] === TYPES.P) pCount++;
      if (s2[i] === TYPES.P) pCount++;
      if (s3[i] === TYPES.P) pCount++;
      const s3Active = i >= s3StartDay;
      if (pCount === 3) errors.push({ day: i, msg: '¡ALERTA: 3 Perforando!' });
      if (s3Active && pCount < 2) errors.push({ day: i, msg: '¡ALERTA: Menos de 2 Perforando!' });
      days.push({ day: i, s1: s1[i], s2: s2[i], s3: s3[i], pCount, hasError: (pCount === 3) || (s3Active && pCount < 2) });
    }

    setSchedule({ s1, s2, s3, days });
    setStats({ errors });
  }, []);

  return { schedule, stats, calculateSchedule };
};
