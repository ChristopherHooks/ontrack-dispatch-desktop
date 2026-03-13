import type { CreateLeadDto } from '../types/models'

/**
 * FMCSA Import Hook — placeholder for future implementation.
 *
 * When ready, this will call the FMCSA QC API to pre-fill lead data
 * from a carrier MC number:
 *   https://mobile.fmcsa.dot.gov/qc/services/carriers/{mc_number}
 *
 * Free API key registration: https://ai.fmcsa.dot.gov/API/Index.aspx
 * Fields to populate: name, company, mc_number, phone, state, authority_date, trailer_type
 */
export async function importFromFMCSA(
  _mcNumber: string,
): Promise<Partial<CreateLeadDto>> {
  // TODO: implement FMCSA API lookup
  throw new Error(
    'FMCSA import not yet implemented. ' +
    'Register for an API key at https://ai.fmcsa.dot.gov/API/Index.aspx'
  )
}
