import { useState, useCallback } from 'react';

const TYPES = {
    S: 'S',
    I: 'I',
    P: 'P',
    B: 'B',
    D: 'D',
    NONE: '-'
};

export const useScheduler = () => {
    const [schedule, setSchedule] = useState({ s1: [], s2: [], s3: [], days: [] });
    const [stats, setStats] = useState({ errors: [] });

    const calculateSchedule = useCallback((config) => {
        const { workDays, restDays, inductionDays, totalDays } = config;
        const drillDaysTarget = workDays - 1 - inductionDays;

        const s1 = [];
        let cycleDay = 0;
        for (let i = 0; i < totalDays; i++) {
            let state = TYPES.D;
            let cyclePos = cycleDay % (workDays + restDays);

            if (cyclePos === 0) state = TYPES.S;
            else if (cyclePos <= inductionDays) state = TYPES.I;
            else if (cyclePos < workDays) state = TYPES.P;
            else if (cyclePos === workDays) state = TYPES.B;
            else state = TYPES.D;

            s1.push(state);
            cycleDay++;
        }

        const s1FirstB = workDays;
        const s3StartDay = s1FirstB - inductionDays - 1;

        const s3 = new Array(totalDays).fill(TYPES.NONE);
        const simulateAgent = (agentArray, startDay, otherAgentsArrays, isS2 = false) => {
            let state = TYPES.NONE;
            let stateDayCounter = 0;
            let daysDrilledInCycle = 0;

            for (let i = 0; i < totalDays; i++) {
                if (i < startDay) {
                    agentArray[i] = TYPES.NONE;
                    continue;
                }

                if (i === startDay) {
                    state = TYPES.S;
                    stateDayCounter = 0;
                    daysDrilledInCycle = 0;
                }

                agentArray[i] = state;

                const nextDayIndex = i + 1;
                if (nextDayIndex >= totalDays) break;

                let nextState = state;
                stateDayCounter++;

                if (state === TYPES.S) {
                    nextState = TYPES.I;
                    stateDayCounter = 0;
                }
                else if (state === TYPES.I) {
                    if (stateDayCounter >= inductionDays) {
                        nextState = TYPES.P;
                        stateDayCounter = 0;
                    }
                }
                else if (state === TYPES.P) {
                    daysDrilledInCycle++;
                    const othersDrillingTomorrow = otherAgentsArrays.reduce((acc, agent) =>
                        (agent[nextDayIndex] === TYPES.P ? acc + 1 : acc), 0);

                    if (daysDrilledInCycle >= drillDaysTarget) {

                        if (othersDrillingTomorrow >= 2) {
                            nextState = TYPES.B;
                            stateDayCounter = 0;
                        } else {
                            nextState = TYPES.P;
                        }
                    }
                }
                else if (state === TYPES.B) {
                    nextState = TYPES.D;
                    stateDayCounter = 0;
                }
                else if (state === TYPES.D) {
                    const leadTime = 1 + inductionDays;
                    const targetDay = nextDayIndex + leadTime;
                    if (targetDay < totalDays) {
                        const othersDrillingInFuture = otherAgentsArrays.reduce((acc, agent) =>
                            (agent[targetDay] === TYPES.P || agent[targetDay] === undefined ? acc + 1 : acc), 0);

                        if (othersDrillingInFuture < 2) {
                            nextState = TYPES.S;
                            stateDayCounter = 0;
                            daysDrilledInCycle = 0;
                        } else {
                            const maxRest = restDays - 2;
                            if (stateDayCounter >= maxRest) {
                                nextState = TYPES.S;
                                stateDayCounter = 0;
                                daysDrilledInCycle = 0;
                            }
                        }
                    }
                }
                state = nextState;
            }
        };

        simulateAgent(s3, s3StartDay, [s1]);

        const s2 = new Array(totalDays).fill(TYPES.NONE);
        simulateAgent(s2, 0, [s1, s3], true);

        const days = [];
        const errors = [];

        for (let i = 0; i < totalDays; i++) {
            let pCount = 0;
            if (s1[i] === TYPES.P) pCount++;
            if (s2[i] === TYPES.P) pCount++;
            if (s3[i] === TYPES.P) pCount++;

            const s3Active = i >= s3StartDay;

            let error = null;
            if (pCount === 3) error = "¡ALERTA: 3 Perforando!";
            if (s3Active && pCount < 2) error = "¡ALERTA: Menos de 2 Perforando!";

            if (error) {
                errors.push({ day: i, msg: error });
            }

            days.push({
                day: i,
                s1: s1[i],
                s2: s2[i],
                s3: s3[i],
                pCount,
                hasError: !!error
            });
        }

        setSchedule({ s1, s2, s3, days });
        setStats({ errors });

    }, []);

    return { schedule, stats, calculateSchedule };
};