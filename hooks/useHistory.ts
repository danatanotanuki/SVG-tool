import { useState, useCallback, useRef } from 'react';

export const useHistory = <T>(initialState: T) => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const batchInProgress = useRef(false);
    const hasCreatedBatchEntry = useRef(false);

    const state = history[currentIndex];
    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    const beginBatchUpdate = useCallback(() => {
        batchInProgress.current = true;
        hasCreatedBatchEntry.current = false;
    }, []);
    
    const endBatchUpdate = useCallback(() => {
        batchInProgress.current = false;
        hasCreatedBatchEntry.current = false;
    }, []);

    const setState = useCallback((action: T | ((prevState: T) => T)) => {
        const newState = typeof action === 'function' 
            ? (action as (prevState: T) => T)(state) 
            : action;

        if (batchInProgress.current) {
            if (hasCreatedBatchEntry.current) {
                // Batch is in progress, replace the current entry
                const newHistory = [...history];
                newHistory[currentIndex] = newState;
                setHistory(newHistory);
            } else {
                // This is the first update in a batch, create a new entry
                const newHistory = history.slice(0, currentIndex + 1);
                newHistory.push(newState);
                setHistory(newHistory);
                setCurrentIndex(newHistory.length - 1);
                hasCreatedBatchEntry.current = true;
            }
        } else {
            // Not a batch update, standard behavior
            const newHistory = history.slice(0, currentIndex + 1);
            newHistory.push(newState);
            setHistory(newHistory);
            setCurrentIndex(newHistory.length - 1);
        }
    }, [currentIndex, history, state]);

    const undo = useCallback(() => {
        if (canUndo) {
            setCurrentIndex(prevIndex => prevIndex - 1);
        }
    }, [canUndo]);

    const redo = useCallback(() => {
        if (canRedo) {
            setCurrentIndex(prevIndex => prevIndex + 1);
        }
    }, [canRedo]);

    return { state, setState, undo, redo, canUndo, canRedo, beginBatchUpdate, endBatchUpdate };
};
