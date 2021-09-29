import styled from "styled-components";
import { color } from "metabase/lib/colors";

export const LoadMoreButton = styled.button`
  font-family: var(--default-font-family);
  display: flex;
  align-items: center;
  cursor: pointer;
  color: ${color("brand")};
  padding: 0.25rem 1.5rem;
  font-size: 14px;
  font-weight: 700;
`;

export const LoadMoreRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: center;
  list-style: none;
`;
