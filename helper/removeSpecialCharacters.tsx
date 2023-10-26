export const removeSpecialCharacters = (dni: string): string => {
  const dniRecomveCharacters  = dni.replace(/[^\w\s]/gi, '')
  return dniRecomveCharacters
}