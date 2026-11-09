const lf=(n:number)=>{let s=0;for(let i=2;i<=n;i++)s+=Math.log(i);return s};
const h=(a:number,b:number,c:number,d:number)=>Math.exp(lf(a+b)+lf(c+d)+lf(a+c)+lf(b+d)-lf(a+b+c+d)-lf(a)-lf(b)-lf(c)-lf(d));
export const fisher=(k1:number,n1:number,k2:number,n2:number)=>{const K=k1+k2,p0=h(k1,n1-k1,K-k1,n2-(K-k1));let p=0;for(let x=Math.max(0,K-n2);x<=Math.min(K,n1);x++){const q=h(x,n1-x,K-x,n2-(K-x));if(q<=p0*(1+1e-9))p+=q}return Math.min(1,p)};
if (import.meta.main){const [a,b,c,d]=Bun.argv.slice(2).map(Number);console.log(fisher(a,b,c,d).toFixed(3))}
