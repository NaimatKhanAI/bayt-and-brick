export const supportsPeriod = (property, period) => !property.rentalPeriod || property.rentalPeriod === 'both' || property.rentalPeriod === period
export const propertyPeriod = (property, preferred = 'monthly') => supportsPeriod(property, preferred) ? preferred : property.rentalPeriod
