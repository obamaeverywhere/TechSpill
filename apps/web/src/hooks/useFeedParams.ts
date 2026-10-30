import { useLayoutEffect, useRef } from "react";
import {
  useSearchParams,
  createSearchParams,
  type URLSearchParamsInit,
} from "react-router-dom";

// Keep rapid filter actions composed even before React Router commits its next render.
export function useFeedParams() {
  const [params, navigate] = useSearchParams();
  const current = useRef(params);
  useLayoutEffect(() => {
    current.current = params;
  }, [params]);
  const setParams = (next: URLSearchParamsInit) => {
    current.current = createSearchParams(next);
    navigate(current.current);
  };
  return [params, setParams, current] as const;
}
