export const isValidDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value
export const availableBy = (property, date) => !date || (isValidDate(date) && isValidDate(property.availableFrom) && property.availableFrom <= date)
