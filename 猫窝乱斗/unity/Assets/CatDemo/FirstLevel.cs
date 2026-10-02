using System;
using UnityEngine;

namespace CatDemo {
[Serializable] public class FirstLevel {
 public int Gold=10, EnemyHP=32, HP=40, Attacks, CatX=1, CatY=1, ToyX=-1, ToyY=-1;
 public bool Bought, Fighting, Finished, Won, Rewarded, Vertical, Curled, ToyVertical;
 public double Time, NextCat, NextEnemy;
 public string Last="把逗猫棒放在面条旁边";
 public Vector2Int[] CatCells => Curled ? new[]{new Vector2Int(0,0),new Vector2Int(1,0),new Vector2Int(0,1)} : new[]{new Vector2Int(0,0),new Vector2Int(1,0),new Vector2Int(2,0)};
 public Vector2Int[] Cells(bool cat) {
  var a=cat?CatCells:new[]{new Vector2Int(0,0),new Vector2Int(1,0)};
  bool rot=cat?Vertical:ToyVertical;
  if(rot) for(int i=0;i<a.Length;i++) a[i]=new Vector2Int(a[i].y,a[i].x);
  return a;
 }
 public bool Valid(bool cat,int x,int y) {
  foreach(var a in Cells(cat)) {
   int ax=x+a.x,ay=y+a.y;if(ax<0||ay<0||ax>=4||ay>=4)return false;
   int ox=cat?ToyX:CatX,oy=cat?ToyY:CatY;
   if(ox<0)continue;
   foreach(var b in Cells(!cat))if(ax==ox+b.x&&ay==oy+b.y)return false;
  }return true;
 }
 public bool Place(bool cat,int x,int y){if(Fighting||Finished||(!cat&&!Bought)||!Valid(cat,x,y))return false;if(cat){CatX=x;CatY=y;}else{ToyX=x;ToyY=y;}return true;}
 public bool Connected {get{if(!Bought||ToyX<0)return false;foreach(var a in Cells(true))foreach(var b in Cells(false))if(Math.Abs(CatX+a.x-ToyX-b.x)+Math.Abs(CatY+a.y-ToyY-b.y)==1)return true;return false;}}
 public double Interval=>Connected?1.25:2;
 public bool Buy(){if(Bought||Gold<3||Fighting||Finished)return false;Gold-=3;Bought=true;return true;}
 public void TransformCat(bool pose){if(Fighting||Finished)return;bool v=Vertical,c=Curled;if(pose)Curled=!Curled;else Vertical=!Vertical;if(!Valid(true,CatX,CatY)){Vertical=v;Curled=c;Last="这里放不下，先挪出一点空间";}}
 public void RotateToy(){if(Fighting||Finished)return;ToyVertical=!ToyVertical;if(ToyX>=0&&!Valid(false,ToyX,ToyY))ToyVertical=!ToyVertical;}
 public void Start(){if(Fighting||Finished)return;Time=0;HP=40;EnemyHP=32;Attacks=0;NextCat=Interval;NextEnemy=3;Fighting=true;Last="面条开始守梦";}
 public void Tick(double dt){if(!Fighting||dt<=0)return;double target=Math.Min(25,Time+dt);while(Fighting&&Math.Min(NextCat,NextEnemy)<=target+0.0000001){double t=Math.Min(NextCat,NextEnemy);Time=t;bool c=NextCat<=t+0.0000001,e=NextEnemy<=t+0.0000001;int damage=0;if(c){Attacks++;damage=Attacks%3==0?12:4;NextCat+=Interval;Last=damage==12?"连抓！ 4 + 4 + 4":"爪击 4";}if(e){HP=Math.Max(0,HP-3);NextEnemy+=3;}EnemyHP=Math.Max(0,EnemyHP-damage);if(HP==0||EnemyHP==0)End(EnemyHP==0&&HP>0);}if(Fighting){Time=target;if(Time>=25)End(false);}}
 void End(bool win){Fighting=false;Finished=true;Won=win;if(win&&!Rewarded){Gold+=6;Rewarded=true;}Last=win?"梦魇消散 · 金币 +6":"守梦失败，调整摆放再试";}
 public void Retry(){if(!Finished||Won)return;Finished=false;Time=0;HP=40;EnemyHP=32;Attacks=0;Last="调整后再出发";}
}
}
