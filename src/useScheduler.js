import { useState, useCallback } from 'react';

const TYPES = { S: 'S', I: 'I', P: 'P', B: 'B', D: 'D', NONE: '-' };

export const useScheduler = () => {
    const [schedule, setSchedule] = useState({ s1: [], s2: [], s3: [], days: [] });
    const [stats, setStats] = useState({ errors: [] });

    const calculateSchedule = useCallback((config) => {
        const { workDays, restDays, inductionDays, totalDays } = config;
        
        const s1 = [];
        const cycleTotal = workDays + restDays;
        for (let i = 0; i < totalDays; i++) {
            const pos = i % cycleTotal;
            if (pos === 0) s1.push(TYPES.S);
            else if (pos <= inductionDays) s1.push(TYPES.I);
            else if (pos < workDays) s1.push(TYPES.P);
            else if (pos === workDays) s1.push(TYPES.B);
            else s1.push(TYPES.D);
        }

        const s2 = new Array(totalDays).fill(TYPES.D);
        const s3 = new Array(totalDays).fill(TYPES.NONE);

        let s2State = TYPES.S, s2Count = 0;
        let s3State = TYPES.NONE, s3Count = 0;

        for (let i = 0; i < totalDays; i++) {
            s2[i] = s2State;
            s3[i] = s3State;

            const next = i + 1;
            if (next >= totalDays) break;

            const getPCountAt = (day, hypS2, hypS3) => {
                let count = (s1[day] === TYPES.P) ? 1 : 0;
                if (hypS2 === TYPES.P) count++;
                if (hypS3 === TYPES.P) count++;
                return count;
            };

            const leadTime = 1 + inductionDays;

            if (s2State === TYPES.S) s2State = TYPES.I;
            else if (s2State === TYPES.I) {
                s2Count++;
                if (s2Count >= inductionDays) { s2State = TYPES.P; s2Count = 0; }
            }
            else if (s2State === TYPES.P) {
                const s1P = s1[next] === TYPES.P;
                const s3P = s3State === TYPES.P || s3[next] === TYPES.P;
                if (s1P && s3P) s2State = TYPES.B;
            }
            else if (s2State === TYPES.B) s2State = TYPES.D;
            else if (s2State === TYPES.D) {
                if (next + leadTime < totalDays) {
                    if (getPCountAt(next + leadTime, TYPES.NONE, s3[next + leadTime]) < 2) {
                        s2State = TYPES.S; s2Count = 0;
                    }
                }
            }

            if (s3State === TYPES.NONE) {
                if (next + leadTime < totalDays) {
                    if (getPCountAt(next + leadTime, s2[next + leadTime], TYPES.NONE) < 2) s3State = TYPES.S;
                }
            }
            else if (s3State === TYPES.S) s3State = TYPES.I;
            else if (s3State === TYPES.I) {
                s3Count++;
                if (s3Count >= inductionDays) { s3State = TYPES.P; s3Count = 0; }
            }
            else if (s3State === TYPES.P) {
                if (s1[next] === TYPES.P && s2[next] === TYPES.P) s3State = TYPES.B;
            }
            else if (s3State === TYPES.B) s3State = TYPES.D;
            else if (s3State === TYPES.D) {
                if (next + leadTime < totalDays) {
                    if (getPCountAt(next + leadTime, s2[next + leadTime], TYPES.NONE) < 2) {
                        s3State = TYPES.S; s3Count = 0;
                    }
                }
            }
        }

        const days = [];
        const errors = [];
        let s3EverActive = false;

        for (let i = 0; i < totalDays; i++) {
            let pCount = 0;
            if (s1[i] === TYPES.P) pCount++;
            if (s2[i] === TYPES.P) pCount++;
            if (s3[i] === TYPES.P) pCount++;
            if (s3[i] !== TYPES.NONE) s3EverActive = true;

            const dayErrors = [];
            if (pCount > 2) dayErrors.push("3+ Supervisores");
            if (s3EverActive && pCount < 2) dayErrors.push("Déficit: < 2 Supervisores");
            
            const validateFlow = (arr, name) => {
                if (i > 0) {
                    if (arr[i] === TYPES.S && arr[i-1] === TYPES.S) dayErrors.push(`${name}: Doble Subida`);
                    if (arr[i] === TYPES.B && arr[i-1] === TYPES.S) dayErrors.push(`${name}: S-B sin P`);
                    if (arr[i] === TYPES.P && arr[i-1] === TYPES.B) dayErrors.push(`${name}: P tras B`);
                }
            };
            validateFlow(s2, "S2");
            validateFlow(s3, "S3");

            if (dayErrors.length > 0) {
                errors.push({ day: i, messages: dayErrors });
            }

            days.push({
                day: i,
                s1: s1[i],
                s2: s2[i],
                s3: s3[i],
                pCount,
                hasError: dayErrors.length > 0,
                errorMsg: dayErrors.join(" | ")
            });
        }

        setSchedule({ s1, s2, s3, days });
        setStats({ errors });
    }, []);

    return { schedule, stats, calculateSchedule };
};