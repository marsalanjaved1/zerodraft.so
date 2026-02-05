
import { useRef, useEffect, useMemo } from 'react';
import debounce from 'lodash.debounce';

export function useDebounce(callback: (...args: any[]) => void, delay: number) {
    const ref = useRef(callback);

    useEffect(() => {
        ref.current = callback;
    }, [callback]);

    const debouncedCallback = useMemo(() => {
        const func = () => {
            ref.current();
        };
        return debounce(func, delay);
    }, [delay]);

    return debouncedCallback;
}
