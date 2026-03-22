export interface CaratsComponent<T = any> extends JSX.FunctionComponent<T> {
  ssp?: string; // server side props URL pattern, e.g. "/api/data/:id"
  defaultProps?: T
}