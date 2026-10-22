from pathlib import Path
import json
text='''Pell knew the arrival house by its smell: damp canvas, onion broth and the warm metal of a stamp left too close to the stove. The ceiling had been repainted since he worked there. The queues had not improved.

He stood behind a family carrying three square baskets and tried not to reorganize anybody.

Across the room, Asha Bell was teaching Snow White to ignore a biscuit balanced on an overturned cup. Snow watched Asha’s hand, her cream-frosted tail sweeping the floor once. Madger watched the biscuit. When Asha finally gave the familiar cue, both leaned forward.

“Only one of you earned that,” she said.

They had reached Latchford after two days on the road. Madger wanted an afternoon with Asha before the next departure. Pell had promised to return an old desk stamp, the one whose handle he had repaired and then somehow kept for five years. Neither plan required an emergency.

At the counter, a young otter clerk turned a ledger around.

“You’ve already arrived,” she told the basket family.

The father smiled uncertainly. “We have. Just now.”

“No. This morning.”

His partner put down her smallest basket. Something inside it rustled: seedlings, carefully wrapped against the wind. Their child had fallen asleep standing against her coat.

The clerk showed them the room assignment. Their three places had been signed for before noon. Supper had been collected. Someone had left a request not to be disturbed.

Pell moved closer despite himself. The name was correct. So was the origin. Whoever had used it knew the family was coming.

Madger stopped looking at the biscuit.

The family had traveled from Willowmere. They had lost time helping secure a wheel, and their last message had been sent ahead with a faster cart. Now the light outside was turning the color of unpolished brass. The clerk had one small room left, reserved for a later party.

“We can put them in ours,” Madger said.

“You can offer your bed,” Asha said. “Pell’s is Pell’s.”

Pell nodded before Madger could apologize. “They can have it.”

The clerk looked relieved, and that relief troubled him. A bed would solve the immediate discomfort. It would not explain who had eaten the family’s supper.

“Show me what arrived before noon,” he said.

She brought a message slip. Its top line read ARRIVAL CONFIRMED. Below were the family’s name, three passengers and the correct baskets. At the bottom, in much smaller writing, was the number of a relay receipt.

“Who saw them?” Pell asked.

“The message says—”

“Who saw them here?”

The clerk pressed her thumb into a worn place on the counter. No one had. She had copied a message acknowledgment into the arrivals book. A courier had then collected the key, saying he would escort the family from the yard.

Pell remembered a different counter, a different family and his own confident finger pointing toward the wrong queue. He still did not know their names.

“Keep the original slip,” he said. “Don’t tidy this page.”

Madger asked Snow to wait with Asha. There was no useful scent item from the courier, and a room full of travelers was not a trail she could be expected to untangle on command. Asha settled on a bench with the tired child nearby. Snow lay at her feet. The biscuit cup became a little tower for the child’s fingers when they woke.

Upstairs, Madger knocked. No answer. The arrival-house keeper opened the room with a spare key.

Three beds stood empty. On the table were three bowls, wiped almost clean, and a narrow strip of ochre cloth. The window opened onto a roof slick with drizzle. Madger leaned toward it, then stepped back. There was no reason yet to climb onto anything.

Pell looked under the bowls. One held a tiny curl of blue paper, caught where the glaze had cracked.

Downstairs, a traveler was paying a rat in a brown coat for a blue lodging ticket.

Madger reached the bottom step as the traveler tucked the ticket away.

“Which room?” he asked.

The rat named the room they had just left.

Pell placed the curl of paper beside the remaining tickets. The shade matched. It was a reason to ask a question, not a verdict. He asked the keeper to check the ticket number against the room ledger.

The rat set his case on the floor. For an instant Madger thought he was giving up. Instead he kicked the case into the narrow passage and ran toward the yard.

Madger moved after him. A kitchen worker came through the opposite door carrying a pot. The case struck her ankle. She staggered, and boiling broth tilted toward a seated traveler.

Madger caught the pot handle in a folded towel from the counter. The worker kept hold of the other side. Together they lowered it onto the stone hearth. By the time he looked up, the yard door was swinging shut.

He had saved a pot and lost a thief. The thought came hot and childish. Then he saw the seated traveler’s bare paws beneath the bench, exactly where the broth would have fallen.

Outside, the keeper called to the yard steward. The outer departure gate was already shut for an arriving wagon to turn. The rat had nowhere to run without climbing into moving wheels. The steward stopped him, and two other workers stayed until the local watch arrived.

He had copied names from delivery notices, collected unclaimed room keys as an invented escort, and sold the beds a second time. The supper bowls were his own small indulgence. The blue tickets had been cut from cheap paper anyone could buy. There was no clever machine behind it, only a line of writing made to mean something it did not mean and a confident manner that discouraged questions.

The keeper recorded the statements separately. Pell did not let the rat’s confession replace the clerk’s account, or the clerk’s mistake become an accusation against every courier. The traveler who had bought the ticket got a place for the night while the keeper arranged the refund. Recovering the exact payment would take longer.

The basket family moved upstairs. Their seedlings stayed below, away from the stove. The clerk crossed out the false arrival with a single line and wrote beside it who had actually seen the family come through the door. Her hands shook while she did it.

Pell placed his old stamp on the counter.

“I came to give this back,” he said.

“Does it say arrived?”

“It says received.”

She gave him a weary look.

“Yes,” he said. “That’s the trouble with useful words. You have to say what.”

Asha had ordered fresh broth. Snow was asleep, one ear turned toward the room, her collar charm resting against her foreleg. Madger sat beside them and discovered that stopping had left his hands unsteady.

“You missed the chase,” Asha said.

“I noticed.”

“You didn’t miss the person in front of you.”

At the counter, the clerk was asking the next traveler a question and waiting for the whole answer. Pell listened without getting up to help.

The last reserved room remained empty until well after supper. No one sold it. When its travelers finally arrived, wet and cross and loudly hungry, the keeper handed them their key.

Madger looked at the door, then at Asha.

“We still have tomorrow morning,” he said.

She pushed the biscuit cup toward him.

“Let’s see if you can wait.”'''
s=dict(id='JW-S01',title='A Place Left Empty',location='Latchford arrival house; existing community EXT-03',cast=['MADGER','RES-05','NEW-12','SNOW_WHITE'],placement='Complete authored option, after the audience knows the Burrow. No dated episode adoption. The lodging fraud is independent of D17 and does not identify Tessera or any established faction.',word_count=len(text.split()),text=text,production_notes=['Asha remains in Latchford and does not resume an emergency long-route career.','Snow uses familiar cues, rests and never speaks or detects guilt.','Pell’s old wrong-queue memory is preserved without inventing the lost family’s identity.','Unnamed local clerk, keeper, steward and culprit are incidental cast, not new registered faction leaders. No voices assigned.','Arrival-house furniture is generic dressing; no new measured building footprint or canon floor plan is implied.','The two-day Burrow-Latchford journey occurs before the scene; no same-day teleportation.'])
(Path(__file__).parent/'output/Complete_Story.json').write_text(json.dumps(s,indent=2));print(s['word_count'])
