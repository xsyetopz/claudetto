export function ageOn(birth, today) {
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth()) age -= 1;
  else if (
    today.getMonth() === birth.getMonth() &&
    today.getDate() <= birth.getDate()
  )
    age -= 1;
  return age;
}
