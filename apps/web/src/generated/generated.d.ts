
declare module '*/FuelDetail.graphql' {
  import { DocumentNode } from 'graphql';
  const defaultDocument: DocumentNode;
  export const accountAndVoucher: DocumentNode;
export const GetMeAVoucher: DocumentNode;
export const RefreshVoucher: DocumentNode;

  export default defaultDocument;
}
    

declare module '*/FuelPriceContext.graphql' {
  import { DocumentNode } from 'graphql';
  const defaultDocument: DocumentNode;
  export const GetFuelPrice: DocumentNode;

  export default defaultDocument;
}
    