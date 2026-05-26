import { useRef } from "react";

export const useRenderCount = (id?: string) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const lastItemId = useRef(id);

  /**
   * See more at: https://legendapp.com/open-source/list/v3/performance/#recycling-list-items
   */
  if (lastItemId.current !== id) {
    lastItemId.current = id;
    renderCount.current = 1;
  }

  return renderCount.current;
};
