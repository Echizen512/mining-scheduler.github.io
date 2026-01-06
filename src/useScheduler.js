import { useState, useCallback } from 'react';

const TYPES = { S: 'S', I: 'I', P: 'P', B: 'B', D: 'D', NONE: '-' };

export const useScheduler = () => {
    const [schedule, setSchedule] = useState({ s1: [], s2: [], s3: [], days: [] });
    const [stats, setStats] = useState({ errors: [] });

    const calculateSchedule = useCallback((config) => {
        const { workDays, restDays, inductionDays, totalDays, priority = 'S+2' } = config;
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

        let s3StartDay = Math.max(0, s1FirstB - 1 - inductionDays);

        if (s3StartDay + 1 + inductionDays !== s1FirstB) {
            let candidate = s3StartDay;
            while (candidate > 0 && candidate + 1 + inductionDays !== s1FirstB) {
                candidate--;
            }
            s3StartDay = Math.max(0, candidate);
        }

        const makeEmpty = () => new Array(totalDays).fill(TYPES.NONE);
        const s2 = makeEmpty();
        const s3 = makeEmpty();

        const hasInductionInRange = (arr, from, to) => {
            const start = Math.max(0, from);
            const end = Math.min(arr.length - 1, to);
            for (let k = start; k <= end; k++) if (arr[k] === TYPES.I) return true;
            return false;
        };

        const simulateAgent = (arr, startDay, otherA, otherB, { isS2 = false, isS3 = false } = {}) => {
            let state = TYPES.NONE;
            let stateDayCounter = 0;
            let daysDrilledInCycle = 0;

            for (let i = 0; i < totalDays; i++) {
                if (i < startDay) { arr[i] = TYPES.NONE; continue; }
                if (i === startDay) { state = TYPES.S; stateDayCounter = 0; arr[i] = state; continue; }

                arr[i] = state;
                const next = i + 1;
                if (next >= totalDays) break;
                let nextState = state;
                stateDayCounter++;

                if (state === TYPES.S) {
                    const inductionWindowFrom = i + 1;
                    const inductionWindowTo = i + inductionDays;
                    const otherHasInduction =
                        hasInductionInRange(otherA, inductionWindowFrom, inductionWindowTo) ||
                        hasInductionInRange(otherB, inductionWindowFrom, inductionWindowTo);

                    if (isS2) {
                        nextState = TYPES.I;
                        stateDayCounter = 0;
                    } else {
                        if (otherHasInduction && (isS3 || !isS2)) {
                            nextState = TYPES.P;
                            stateDayCounter = 0;
                        } else {
                            nextState = TYPES.I;
                            stateDayCounter = 0;
                        }
                    }
                } else if (state === TYPES.I) {
                    if (stateDayCounter >= inductionDays) {
                        nextState = TYPES.P;
                        stateDayCounter = 0;
                    } else {
                        nextState = TYPES.I;
                    }
                } else if (state === TYPES.P) {
                    daysDrilledInCycle++;
                    const othersDrillingTomorrow = (otherA[next] === TYPES.P ? 1 : 0) + (otherB[next] === TYPES.P ? 1 : 0);
                    if (daysDrilledInCycle >= drillDaysTarget) {
                        if (othersDrillingTomorrow >= 2) {
                            nextState = TYPES.B;
                            stateDayCounter = 0;
                        } else {
                            nextState = TYPES.P;
                        }
                    } else {
                        nextState = TYPES.P;
                    }
                } else if (state === TYPES.B) {
                    nextState = TYPES.D;
                    stateDayCounter = 0;
                } else if (state === TYPES.D) {
                    const leadTime = 1 + inductionDays;
                    const targetDay = next + leadTime;
                    if (targetDay < totalDays) {
                        const othersDrillingInFuture = (otherA[targetDay] === TYPES.P ? 1 : 0) + (otherB[targetDay] === TYPES.P ? 1 : 0);
                        if (othersDrillingInFuture < 2) {
                            nextState = TYPES.S;
                            stateDayCounter = 0;
                            daysDrilledInCycle = 0;
                        } else {
                            const maxRest = Math.max(0, restDays - 2);
                            if (stateDayCounter >= maxRest) {
                                nextState = TYPES.S;
                                stateDayCounter = 0;
                                daysDrilledInCycle = 0;
                            } else {
                                nextState = TYPES.D;
                            }
                        }
                    } else {
                        nextState = TYPES.D;
                    }
                }

                state = nextState;
            }

            for (let i = 1; i < arr.length - 1; i++) {
                if (arr[i - 1] === TYPES.S && arr[i] === TYPES.D && arr[i + 1] === TYPES.I) {
                    arr[i] = TYPES.I;
                }
            }

            for (let i = 0; i < arr.length; i++) {
                if (arr[i] === TYPES.S) {
                    let existingI = 0;
                    for (let k = 1; k <= inductionDays; k++) {
                        const idx = i + k;
                        if (idx >= arr.length) break;
                        if (arr[idx] === TYPES.I) existingI++;
                        else break;
                    }
                    for (let k = 1; k <= inductionDays - existingI; k++) {
                        const idx = i + existingI + k;
                        if (idx >= arr.length) break;
                        if (arr[idx] === TYPES.S || arr[idx] === TYPES.B || arr[idx] === TYPES.P) break;
                        arr[idx] = TYPES.I;
                    }
                    let j = i + 1 + existingI;
                    while (j < arr.length && arr[j] === TYPES.I) {
                        arr[j] = TYPES.D;
                        j++;
                    }
                }
            }

            for (let i = 0; i < arr.length; i++) {
                if (arr[i] === TYPES.S) {
                    // contar I contiguas inmediatamente después
                    let countI = 0;
                    for (let k = 1; k <= inductionDays; k++) {
                        const idx = i + k;
                        if (idx >= arr.length) break;
                        if (arr[idx] === TYPES.I) countI++;
                        else break;
                    }
                    const nextIdx = i + 1 + countI;
                    if (nextIdx < arr.length) {
                        if (arr[nextIdx] !== TYPES.P && arr[nextIdx] !== TYPES.B && arr[nextIdx] !== TYPES.S) {
                            arr[nextIdx] = TYPES.P;
                        }
                    }
                }
            }
        };

        simulateAgent(s3, s3StartDay, s1, s2, { isS2: false, isS3: true });
        simulateAgent(s2, 0, s1, s3, { isS2: true, isS3: false });

        const pCountAt = (d, a = s1, b = s2, c = s3) => {
            let ccount = 0;
            if (a[d] === TYPES.P) ccount++;
            if (b[d] === TYPES.P) ccount++;
            if (c[d] === TYPES.P) ccount++;
            return ccount;
        };

        const setAndResimulate = (arr, day, newState, startDay, otherA, otherB, flags = {}) => {
            arr[day] = newState;
            simulateAgent(arr, startDay, otherA, otherB, flags);
        };

        for (let day = 0; day < totalDays; day++) {
            let pCount = pCountAt(day);
            if (pCount > 2) {
                if (priority === 'S2') {
                    if (s2[day] === TYPES.P) { setAndResimulate(s2, day, TYPES.B, 0, s1, s3, { isS2: true }); pCount = pCountAt(day); }
                    if (pCount > 2 && s3[day] === TYPES.P) { setAndResimulate(s3, day, TYPES.B, s3StartDay, s1, s2, { isS3: true }); pCount = pCountAt(day); }
                } else {
                    if (s3[day] === TYPES.P) { setAndResimulate(s3, day, TYPES.B, s3StartDay, s1, s2, { isS3: true }); pCount = pCountAt(day); }
                    if (pCount > 2 && s2[day] === TYPES.P) { setAndResimulate(s2, day, TYPES.B, 0, s1, s3, { isS2: true }); pCount = pCountAt(day); }
                }
            }
        }

        const refineSchedule = (arr, isAgentS2 = false) => {
            const refined = [...arr];

            for (let i = 1; i < refined.length - 1; i++) {
                if (refined[i - 1] === TYPES.S && refined[i] === TYPES.D && refined[i + 1] === TYPES.I) {
                    refined[i] = TYPES.I;
                }
            }

            for (let i = 0; i < refined.length; i++) {
                if (refined[i] === TYPES.S) {
                    let existingI = 0;
                    for (let k = 1; k <= inductionDays; k++) {
                        const idx = i + k;
                        if (idx >= refined.length) break;
                        if (refined[idx] === TYPES.I) existingI++;
                        else break;
                    }
                    for (let k = 1; k <= inductionDays - existingI; k++) {
                        const idx = i + existingI + k;
                        if (idx >= refined.length) break;
                        if (refined[idx] === TYPES.S || refined[idx] === TYPES.B || refined[idx] === TYPES.P) break;
                        refined[idx] = TYPES.I;
                    }
                    let j = i + 1 + existingI;
                    while (j < refined.length && refined[j] === TYPES.I) {
                        refined[j] = TYPES.D;
                        j++;
                    }
                }
            }

            for (let i = 1; i < refined.length; i++) {
                if (refined[i] === TYPES.S && refined[i - 1] === TYPES.S) {
                    const next = i + 1;
                    if (next < refined.length && refined[next] === TYPES.I) {
                        let existingI = 0;
                        for (let k = 1; k <= inductionDays; k++) {
                            const idx = i - 1 + k;
                            if (idx >= refined.length) break;
                            if (refined[idx] === TYPES.I) existingI++;
                            else break;
                        }
                        if (existingI < inductionDays) refined[i] = TYPES.I;
                        else refined[i] = TYPES.D;
                    } else {
                        refined[i] = TYPES.D;
                    }
                }
            }

            for (let i = 0; i < refined.length; i++) {
                if (refined[i] === TYPES.S) {
                    let countI = 0;
                    for (let k = 1; k <= inductionDays; k++) {
                        const idx = i + k;
                        if (idx >= refined.length) break;
                        if (refined[idx] === TYPES.I) countI++;
                        else break;
                    }
                    const nextIdx = i + 1 + countI;
                    if (nextIdx < refined.length) {
                        if (refined[nextIdx] !== TYPES.P && refined[nextIdx] !== TYPES.B && refined[nextIdx] !== TYPES.S) {
                            refined[nextIdx] = TYPES.P;
                        }
                    }
                }
            }

            return refined;
        };

        let fs1 = refineSchedule(s1, false);
        let fs2 = refineSchedule(s2, true);
        let fs3 = refineSchedule(s3, false);

        for (let day = 0; day < totalDays; day++) {
            const s3Active = day >= s3StartDay;
            if (!s3Active) continue;

            let pCount = 0;
            if (fs1[day] === TYPES.P) pCount++;
            if (fs2[day] === TYPES.P) pCount++;
            if (fs3[day] === TYPES.P) pCount++;

            if (pCount >= 2) continue;

            if (fs3[day] !== TYPES.P) {
                const canForceS3P = (fs3[day] === TYPES.I && (() => {
                    let sIndex = -1;
                    for (let k = day; k >= 0; k--) {
                        if (fs3[k] === TYPES.S) { sIndex = k; break; }
                        if (fs3[k] === TYPES.P || fs3[k] === TYPES.B || fs3[k] === TYPES.D) break;
                    }
                    if (sIndex === -1) return true;
                    let countI = 0;
                    for (let k = 1; k <= inductionDays; k++) {
                        const idx = sIndex + k;
                        if (idx >= fs3.length) break;
                        if (fs3[idx] === TYPES.I) countI++;
                        else break;
                    }
                    return countI >= inductionDays;
                })()) || fs3[day] === TYPES.D || fs3[day] === TYPES.NONE;

                if (canForceS3P) {
                    fs3[day] = TYPES.P;
                    simulateAgent(fs3, s3StartDay, fs1, fs2, { isS2: false, isS3: true });
                    pCount = 0;
                    if (fs1[day] === TYPES.P) pCount++;
                    if (fs2[day] === TYPES.P) pCount++;
                    if (fs3[day] === TYPES.P) pCount++;
                    if (pCount >= 2) continue;
                }
            }

            if (fs2[day] !== TYPES.P) {
                const canForceS2P = (fs2[day] === TYPES.I && (() => {
                    let sIndex = -1;
                    for (let k = day; k >= 0; k--) {
                        if (fs2[k] === TYPES.S) { sIndex = k; break; }
                        if (fs2[k] === TYPES.P || fs2[k] === TYPES.B || fs2[k] === TYPES.D) break;
                    }
                    if (sIndex === -1) return true;
                    let countI = 0;
                    for (let k = 1; k <= inductionDays; k++) {
                        const idx = sIndex + k;
                        if (idx >= fs2.length) break;
                        if (fs2[idx] === TYPES.I) countI++;
                        else break;
                    }
                    return countI >= inductionDays;
                })()) || fs2[day] === TYPES.D || fs2[day] === TYPES.NONE;

                if (canForceS2P) {
                    fs2[day] = TYPES.P;
                    simulateAgent(fs2, 0, fs1, fs3, { isS2: true, isS3: false });
                    pCount = 0;
                    if (fs1[day] === TYPES.P) pCount++;
                    if (fs2[day] === TYPES.P) pCount++;
                    if (fs3[day] === TYPES.P) pCount++;
                    if (pCount >= 2) continue;
                }
            }

            const seed = Math.max(0, day - (inductionDays + 1));
            if (fs2[seed] === TYPES.D || fs2[seed] === TYPES.NONE) {
                fs2[seed] = TYPES.S;
                simulateAgent(fs2, 0, fs1, fs3, { isS2: true, isS3: false });
            } else if (fs3[seed] === TYPES.D || fs3[seed] === TYPES.NONE) {
                fs3[seed] = TYPES.S;
                simulateAgent(fs3, s3StartDay, fs1, fs2, { isS2: false, isS3: true });
            }
        }

        fs1 = refineSchedule(fs1, false);
        fs2 = refineSchedule(fs2, true);
        fs3 = refineSchedule(fs3, false);

        const days = [];
        const errors = [];
        for (let i = 0; i < totalDays; i++) {
            let pCount = 0;
            if (fs1[i] === TYPES.P) pCount++;
            if (fs2[i] === TYPES.P) pCount++;
            if (fs3[i] === TYPES.P) pCount++;

            const s3Active = i >= s3StartDay;
            if (pCount === 3) errors.push({ day: i, msg: '¡ALERTA: 3 Perforando!' });
            if (s3Active && pCount < 2) errors.push({ day: i, msg: '¡ALERTA: Menos de 2 Perforando!' });

            days.push({
                day: i,
                s1: fs1[i],
                s2: fs2[i],
                s3: fs3[i],
                pCount,
                hasError: (pCount === 3) || (s3Active && pCount < 2)
            });
        }

        setSchedule({ s1: fs1, s2: fs2, s3: fs3, days });
        setStats({ errors });
    }, []);

    return { schedule, stats, calculateSchedule };
};
