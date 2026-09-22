"""Check independent controls, preserved full-stride geometry and ramp contacts."""
import copy,json
from pathlib import Path
import numpy as np
from ainekio_gait import load,profile,FootPlanner,speed_parameters

def run():
 cfg=load();p=np.linspace(-1,5,1001);a=copy.deepcopy(cfg);a['gait_controls'].update(mode='steady',stride_percent=100,motion_rate=1)
 b=copy.deepcopy(a);b['gait_controls']['motion_rate']=2
 pa,pb=FootPlanner(a),FootPlanner(b)
 assert np.max(abs(pa.x(p)-pb.x(p)))<1e-9
 assert np.max(abs(pa.time(p)-2*pb.time(p)))<1e-9
 for offset in cfg['continuous_walk']['phase_offsets'].values():
  assert np.max(abs(np.array([pa.target(x,offset) for x in p])-np.array([pb.target(x,offset) for x in p])))<1e-9
 v,L,f=speed_parameters(25,2,cfg);assert abs(v-36.5079365079365)<1e-9 and abs(L*.7-23)<1e-9
 planner=FootPlanner(cfg);data=dict(np.load(Path(__file__).resolve().parent/'gait-data.npz'))
 assert np.all(np.diff(data['time_s'])>0)
 drift=0.
 for i in range(4):
  mask=(data['states'][1:,i]==1)&(data['states'][:-1,i]==1)
  drift=max(drift,float(np.linalg.norm(np.diff(data['feet'][:,i,:2],axis=0)[mask],axis=1).max()))
 assert drift<.001
 for node in cfg['gait_controls']['demo_keypoints']:
  z=node['phase'];eps=1e-4
  s,r,_=profile(np.array([z-eps,z,z+eps]),cfg)
  assert np.max(abs(np.diff(s)/eps))<.01 and np.max(abs(np.diff(r)/eps))<.01
 rel=data['feet'][:,:,0]-data['body'][:,None,0]-np.array(cfg['reference_stance_xy_mm'])[None,:,0]
 result={'rate_changes_only_time':True,'2x_halves_time':True,'stride_and_rate_independent':True,'ramp_control_boundary_derivatives_continuous':True,'maximum_planted_reference_step_mm':drift,'fore_aft_reference_range_mm':[float(rel.min()),float(rel.max())],'cycle_pose_seam_deg':float(np.rad2deg(abs(data['q'][0]-data['q'][-1])).max())}
 out=Path(__file__).resolve().parent/'control-checks.json';out.write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))

if __name__=='__main__':run()
