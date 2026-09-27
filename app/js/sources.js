/* Lifespan — bibliographie.
   m: numéro de référence dans la matrice source ([n]) quand il existe.
   verify: true = attribution probable, à confirmer avant publication officielle. */
(function (root) {
  const LS = (root.LS = root.LS || {});
  const pm = (id) => 'https://pubmed.ncbi.nlm.nih.gov/' + id + '/';
  const doi = (d) => 'https://doi.org/' + d;

  LS.SOURCES = {
    arem2015: { m: 53, t: 'Arem H et al. Leisure time physical activity and mortality: a detailed pooled analysis of the dose-response relationship.', j: 'JAMA Intern Med 2015;175:959-67', url: doi('10.1001/jamainternmed.2015.0533') },
    garcia2023: { m: 54, t: 'Garcia L et al. Non-occupational physical activity and risk of cardiovascular disease, cancer and mortality outcomes: a dose-response meta-analysis of large prospective studies.', j: 'Br J Sports Med 2023;57:979-89', url: doi('10.1136/bjsports-2022-105669') },
    lee2022: { m: 57, t: 'Lee DH et al. Long-term leisure-time physical activity intensity and all-cause and cause-specific mortality.', j: 'Circulation 2022;146:523-34', url: doi('10.1161/CIRCULATIONAHA.121.058162'), verify: true },
    ji2024: { m: 59, t: 'Ji H et al. Sex differences in association of physical activity with all-cause and cardiovascular mortality.', j: 'J Am Coll Cardiol 2024;83:783-93', url: doi('10.1016/j.jacc.2023.12.019') },
    stens2023: { m: 61, t: 'Stens NA et al. Relationship of daily step counts to all-cause mortality and cardiovascular events.', j: 'J Am Coll Cardiol 2023;82:1483-94', url: doi('10.1016/j.jacc.2023.07.029') },
    paluch2022: { m: 63, t: 'Paluch AE et al. Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts.', j: 'Lancet Public Health 2022;7:e219-28', url: doi('10.1016/S2468-2667(21)00302-9'), verify: true },
    ding2025: { m: 64, t: 'Ding D et al. Daily steps and health outcomes in adults: a systematic review and dose-response meta-analysis.', j: 'Lancet Public Health 2025', url: 'https://www.thelancet.com/journals/lanpub/home' },
    banach2023: { m: 66, t: 'Banach M et al. The association between daily step count and all-cause and cardiovascular mortality: a meta-analysis.', j: 'Eur J Prev Cardiol 2023;30:1975-85', url: doi('10.1093/eurjpc/zwad229') },
    ajufo2024: { m: 76, t: 'Ajufo E et al. Accelerometer-measured sedentary behavior and risk of future cardiovascular disease.', j: 'J Am Coll Cardiol 2025;85:45-59', url: 'https://www.jacc.org/', verify: true },
    moore2016: { m: 80, t: 'Moore SC et al. Association of leisure-time physical activity with risk of 26 types of cancer in 1.44 million adults.', j: 'JAMA Intern Med 2016;176:816-25', url: doi('10.1001/jamainternmed.2016.1548') },
    smith2016: { m: 87, t: 'Smith AD et al. Physical activity and incident type 2 diabetes mellitus: a systematic review and dose-response meta-analysis of prospective cohort studies.', j: 'Diabetologia 2016;59:2527-45', url: doi('10.1007/s00125-016-4079-0') },
    patterson2018: { m: 92, t: 'Patterson R et al. Sedentary behaviour and risk of all-cause, cardiovascular and cancer mortality, and incident type 2 diabetes: a systematic review and dose response meta-analysis.', j: 'Eur J Epidemiol 2018;33:811-29', url: doi('10.1007/s10654-018-0380-1') },
    isomarkku2022: { m: 96, t: 'Iso-Markku P et al. Physical activity as a protective factor for dementia and Alzheimer\'s disease: systematic review, meta-analysis and quality assessment of cohort and case-control studies.', j: 'Br J Sports Med 2022;56:701-9', url: doi('10.1136/bjsports-2021-104981'), verify: true },
    shailendra2022: { m: 105, t: 'Shailendra P et al. Resistance training and mortality risk: a systematic review and meta-analysis.', j: 'Am J Prev Med 2022;63:277-85', url: doi('10.1016/j.amepre.2022.03.020') },
    momma2022: { m: 110, t: 'Momma H et al. Muscle-strengthening activities are associated with lower risk and mortality in major non-communicable diseases: a systematic review and meta-analysis of cohort studies.', j: 'Br J Sports Med 2022;56:755-63', url: doi('10.1136/bjsports-2021-105061') },
    sagelv2023: { m: 114, t: 'Sagelv EH et al. Device-measured physical activity, sedentary time, and risk of all-cause mortality: an individual participant data analysis of four prospective cohort studies.', j: 'Br J Sports Med 2023;57:1457-63', url: doi('10.1136/bjsports-2022-106568') },
    ekelund2016: { t: 'Ekelund U et al. Does physical activity attenuate, or even eliminate, the detrimental association of sitting time with mortality? A harmonised meta-analysis of data from more than 1 million men and women.', j: 'Lancet 2016;388:1302-10', url: doi('10.1016/S0140-6736(16)30370-1') },
    moore2012: { m: 120, t: 'Moore SC et al. Leisure time physical activity of moderate to vigorous intensity and mortality: a large pooled cohort analysis.', j: 'PLoS Med 2012;9:e1001335', url: doi('10.1371/journal.pmed.1001335') },
    pearce2022: { t: 'Pearce M et al. Association between physical activity and risk of depression: a systematic review and meta-analysis.', j: 'JAMA Psychiatry 2022;79:550-9', url: doi('10.1001/jamapsychiatry.2022.0609') },
    lang2024: { t: 'Lang JJ et al. Comparison of objectively measured and estimated cardiorespiratory fitness to predict all-cause and CVD mortality in adults: 42 studies, 3.8 million observations.', j: 'J Sport Health Sci 2024', url: pm('39271056') },
    kodama2009: { t: 'Kodama S et al. Cardiorespiratory fitness as a quantitative predictor of all-cause mortality and cardiovascular events in healthy men and women: a meta-analysis.', j: 'JAMA 2009;301:2024-35', url: pm('19454641') },
    leong2015: { t: 'Leong DP et al. Prognostic value of grip strength: findings from the Prospective Urban Rural Epidemiology (PURE) study.', j: 'Lancet 2015;386:266-73', url: doi('10.1016/S0140-6736(14)62000-6') },

    liu2017: { m: 1, t: 'Liu TZ et al. Sleep duration and risk of all-cause mortality: a flexible, non-linear, meta-regression of 40 prospective cohort studies.', j: 'Sleep Med Rev 2017;32:28-36', url: doi('10.1016/j.smrv.2016.02.005') },
    yin2017: { m: 2, t: 'Yin J et al. Relationship of sleep duration with all-cause mortality and cardiovascular events: a systematic review and dose-response meta-analysis.', j: 'J Am Heart Assoc 2017;6:e005947', url: doi('10.1161/JAHA.117.005947'), verify: true },
    shan2015: { m: 17, t: 'Shan Z et al. Sleep duration and risk of type 2 diabetes: a meta-analysis of prospective studies.', j: 'Diabetes Care 2015;38:529-37', url: doi('10.2337/dc14-2073') },
    sofi2014: { m: 37, t: 'Sofi F et al. Insomnia and risk of cardiovascular disease: a meta-analysis.', j: 'Eur J Prev Cardiol 2014;21:57-64', url: doi('10.1177/2047487312460020') },
    torquati2018: { m: 39, t: 'Torquati L et al. Shift work and the risk of cardiovascular disease. A systematic review and meta-analysis including dose-response relationship.', j: 'Scand J Work Environ Health 2018;44:229-38', url: doi('10.5271/sjweh.3700') },
    baglioni2011: { t: 'Baglioni C et al. Insomnia as a predictor of depression: a meta-analytic evaluation of longitudinal epidemiological studies.', j: 'J Affect Disord 2011;135:10-19', url: doi('10.1016/j.jad.2011.01.011') },

    carter2015: { m: 128, t: 'Carter BD et al. Smoking and mortality — beyond established causes.', j: 'N Engl J Med 2015;372:631-40', url: doi('10.1056/NEJMsa1407211') },
    inoue2017: { m: 131, t: 'Inoue-Choi M et al. Association of long-term, low-intensity smoking with all-cause and cause-specific mortality in the NIH-AARP Diet and Health Study.', j: 'JAMA Intern Med 2017;177:87-95', url: doi('10.1001/jamainternmed.2016.7511') },
    hackshaw2018: { m: 133, t: 'Hackshaw A et al. Low cigarette consumption and risk of coronary heart disease and stroke: meta-analysis of 141 cohort studies in 55 study reports.', j: 'BMJ 2018;360:j5855', url: doi('10.1136/bmj.j5855') },
    jha2013: { m: 139, t: 'Jha P et al. 21st-century hazards of smoking and benefits of cessation in the United States.', j: 'N Engl J Med 2013;368:341-50', url: doi('10.1056/NEJMsa1211128') },
    doll2004: { m: 141, t: 'Doll R et al. Mortality in relation to smoking: 50 years\' observations on male British doctors.', j: 'BMJ 2004;328:1519', url: doi('10.1136/bmj.38142.554479.AE'), verify: true },
    zhong2015: { m: 157, t: 'Zhong G et al. Smoking is associated with an increased risk of dementia: a meta-analysis of prospective cohort studies with investigation of potential effect modifiers.', j: 'PLoS One 2015;10:e0118333', url: doi('10.1371/journal.pone.0118333') },
    cho2024: { m: 129, t: 'Cho ER et al. Smoking cessation and short- and longer-term mortality.', j: 'NEJM Evid 2024;3:EVIDoa2300272', url: doi('10.1056/EVIDoa2300272'), verify: true },
    pan2015: { t: 'Pan A et al. Relation of active, passive, and quitting smoking with incident type 2 diabetes: a systematic review and meta-analysis.', j: 'Lancet Diabetes Endocrinol 2015;3:958-67', url: doi('10.1016/S2213-8587(15)00316-2') },
    taylor2014: { t: 'Taylor G et al. Change in mental health after smoking cessation: systematic review and meta-analysis.', j: 'BMJ 2014;348:g1151', url: doi('10.1136/bmj.g1151') },

    wood2018: { m: 161, t: 'Wood AM et al. Risk thresholds for alcohol consumption: combined analysis of individual-participant data for 599 912 current drinkers in 83 prospective studies.', j: 'Lancet 2018;391:1513-23', url: doi('10.1016/S0140-6736(18)30134-X') },
    bagnardi2015: { m: 176, t: 'Bagnardi V et al. Alcohol consumption and site-specific cancer risk: a comprehensive dose-response meta-analysis.', j: 'Br J Cancer 2015;112:580-93', url: doi('10.1038/bjc.2014.579') },
    xu2017: { m: 183, t: 'Xu W et al. Alcohol consumption and dementia risk: a dose-response meta-analysis of prospective studies.', j: 'Eur J Epidemiol 2017;32:31-42', url: doi('10.1007/s10654-017-0225-3'), verify: true },

    storck2025: { m: 192, t: 'Storck W et al. Cannabis use and risk of cardiovascular diseases: a systematic review and meta-analysis.', j: 'Heart 2025', url: 'https://heart.bmj.com/', verify: true },
    degenhardt2011: { m: 204, t: 'Degenhardt L et al. Mortality among regular or dependent users of heroin and other opioids: a systematic review and meta-analysis of cohort studies.', j: 'Addiction 2011;106:32-51', url: doi('10.1111/j.1360-0443.2010.03140.x') },
    cocaine_smr: { m: 199, t: 'Méta-analyse des cohortes d\'usagers réguliers de cocaïne (SMR 6,13), citée dans la matrice.', j: 'Matrice [199]', url: '', verify: true },

    gbmc2016: { m: 404, t: 'Global BMI Mortality Collaboration. Body-mass index and all-cause mortality: individual-participant-data meta-analysis of 239 prospective studies in four continents.', j: 'Lancet 2016;388:776-86', url: doi('10.1016/S0140-6736(16)30175-1') },
    peeters2003: { m: 412, t: 'Peeters A et al. Obesity in adulthood and its consequences for life expectancy: a life-table analysis.', j: 'Ann Intern Med 2003;138:24-32', url: doi('10.7326/0003-4819-138-1-200301070-00008') },
    jayedi2020: { m: 421, t: 'Jayedi A et al. Central fatness and risk of all cause mortality: systematic review and dose-response meta-analysis of 72 prospective cohort studies.', j: 'BMJ 2020;370:m3324', url: doi('10.1136/bmj.m3324') },
    luppino2010: { t: 'Luppino FS et al. Overweight, obesity, and depression: a systematic review and meta-analysis of longitudinal studies.', j: 'Arch Gen Psychiatry 2010;67:220-9', url: doi('10.1001/archgenpsychiatry.2010.2') },

    lewington2002: { m: 427, t: 'Lewington S et al (Prospective Studies Collaboration). Age-specific relevance of usual blood pressure to vascular mortality.', j: 'Lancet 2002;360:1903-13', url: doi('10.1016/S0140-6736(02)11911-8') },
    bplttc2021: { m: 432, t: 'Blood Pressure Lowering Treatment Trialists\' Collaboration. Pharmacological blood pressure lowering for primary and secondary prevention of cardiovascular disease across different levels of blood pressure.', j: 'Lancet 2021;397:1625-36', url: doi('10.1016/S0140-6736(21)00590-0') },
    ettehad2016: { m: 439, t: 'Ettehad D et al. Blood pressure lowering for prevention of cardiovascular disease and death: a systematic review and meta-analysis.', j: 'Lancet 2016;387:957-67', url: doi('10.1016/S0140-6736(15)01225-8') },

    selvin2010: { m: 456, t: 'Selvin E et al. Glycated hemoglobin, diabetes, and cardiovascular risk in nondiabetic adults.', j: 'N Engl J Med 2010;362:800-11', url: doi('10.1056/NEJMoa0908359') },
    stratton2000: { m: 462, t: 'Stratton IM et al. Association of glycaemia with macrovascular and microvascular complications of type 2 diabetes (UKPDS 35).', j: 'BMJ 2000;321:405-12', url: doi('10.1136/bmj.321.7258.405') },
    erfc2011: { t: 'Emerging Risk Factors Collaboration. Diabetes mellitus, fasting glucose, and risk of cause-specific death.', j: 'N Engl J Med 2011;364:829-41', url: doi('10.1056/NEJMoa1008862') },
    erfc2015: { t: 'Emerging Risk Factors Collaboration. Association of cardiometabolic multimorbidity with mortality.', j: 'JAMA 2015;314:52-60', url: doi('10.1001/jama.2015.7008') },

    ctt2010: { m: 474, t: 'Cholesterol Treatment Trialists\' Collaboration. Efficacy and safety of more intensive lowering of LDL cholesterol: a meta-analysis of data from 170 000 participants in 26 randomised trials.', j: 'Lancet 2010;376:1670-81', url: doi('10.1016/S0140-6736(10)61350-5') },
    johannesen2020: { m: 481, t: 'Johannesen CDL et al. Association between low density lipoprotein and all cause and cause specific mortality in Denmark: prospective cohort study.', j: 'BMJ 2020;371:m4266', url: doi('10.1136/bmj.m4266') },
    madsen2017: { m: 491, t: 'Madsen CM et al. Extreme high high-density lipoprotein cholesterol is paradoxically associated with high mortality in men and women: two prospective cohort studies.', j: 'Eur Heart J 2017;38:2478-86', url: doi('10.1093/eurheartj/ehx163') },
    hokanson1996: { m: 495, t: 'Hokanson JE, Austin MA. Plasma triglyceride level is a risk factor for cardiovascular disease independent of high-density lipoprotein cholesterol level: a meta-analysis.', j: 'J Cardiovasc Risk 1996;3:213-9', url: pm('8836866') },
    erfc2009: { m: 496, t: 'Emerging Risk Factors Collaboration. Major lipids, apolipoproteins, and risk of vascular disease.', j: 'JAMA 2009;302:1993-2000', url: doi('10.1001/jama.2009.1619') },
    zhang2016: { t: 'Zhang D, Shen X, Qi X. Resting heart rate and all-cause and cardiovascular mortality in the general population: a meta-analysis.', j: 'CMAJ 2016;188:E53-63', url: pm('26598376') },

    russ2012: { m: 330, t: 'Russ TC et al. Association between psychological distress and mortality: individual participant pooled analysis of 10 prospective cohort studies.', j: 'BMJ 2012;345:e4933', url: doi('10.1136/bmj.e4933') },
    santosa2021: { m: 337, t: 'Santosa A et al. Psychosocial risk factors and cardiovascular disease and death in a population-based cohort from 21 low-, middle-, and high-income countries (PURE).', j: 'JAMA Netw Open 2021;4:e2138920', url: doi('10.1001/jamanetworkopen.2021.38920') },
    franks2021: { m: 344, t: 'Méta-analyse stress perçu et démence (HR 1,44), citée dans la matrice.', j: 'Matrice [344]', url: '', verify: true },
    cuijpers2014: { t: 'Cuijpers P et al. Comprehensive meta-analysis of excess mortality in depression in the general community versus patients with specific illnesses.', j: 'Am J Psychiatry 2014;171:453-62', url: pm('24434956') },
    wang2023: { m: 350, t: 'Wang F et al. A systematic review and meta-analysis of 90 cohort studies of social isolation, loneliness and mortality.', j: 'Nat Hum Behav 2023;7:1307-19', url: doi('10.1038/s41562-023-01617-6') },
    ricouribe2018: { m: 353, t: 'Rico-Uribe LA et al. Association of loneliness with all-cause mortality: a meta-analysis.', j: 'PLoS One 2018;13:e0190033', url: doi('10.1371/journal.pone.0190033') },
    holtlunstad2010: { m: 358, t: 'Holt-Lunstad J, Smith TB, Layton JB. Social relationships and mortality risk: a meta-analytic review.', j: 'PLoS Med 2010;7:e1000316', url: doi('10.1371/journal.pmed.1000316') },
    valtorta2016: { m: 359, t: 'Valtorta NK et al. Loneliness and social isolation as risk factors for coronary heart disease and stroke.', j: 'Heart 2016;102:1009-16', url: doi('10.1136/heartjnl-2015-308790') },
    shen2022: { m: 365, t: 'Shen C et al. Associations of social isolation and loneliness with later dementia.', j: 'Neurology 2022;99:e164-75', url: doi('10.1212/WNL.0000000000200583'), verify: true },
    martinmaria2017: { m: 368, t: 'Martín-María N et al. The impact of subjective well-being on mortality: a meta-analysis of longitudinal studies in the general population.', j: 'Psychosom Med 2017;79:565-75', url: doi('10.1097/PSY.0000000000000444'), verify: true },
    zaninotto2019: { m: 374, t: 'Zaninotto P, Steptoe A. Association between subjective well-being and living longer without disability or illness.', j: 'JAMA Netw Open 2019;2:e196870', url: doi('10.1001/jamanetworkopen.2019.6870') },
    rozanski2019: { m: 379, t: 'Rozanski A et al. Association of optimism with cardiovascular events and all-cause mortality: a systematic review and meta-analysis.', j: 'JAMA Netw Open 2019;2:e1912200', url: doi('10.1001/jamanetworkopen.2019.12200') },
    cohen2016: { t: 'Cohen R, Bavishi C, Rozanski A. Purpose in life and its relationship to all-cause mortality and cardiovascular events: a meta-analysis.', j: 'Psychosom Med 2016;78:122-33', url: doi('10.1097/PSY.0000000000000274') },
    livingston2020: { t: 'Livingston G et al. Dementia prevention, intervention, and care: 2020 report of the Lancet Commission.', j: 'Lancet 2020;396:413-46', url: doi('10.1016/S0140-6736(20)30367-6') },

    zhang2021: { m: 303, t: 'Méta-analyse de 142 études (> 2,5 M participants) sur les scores de mode de vie combinés, citée dans la matrice.', j: 'Matrice [303]', url: '', verify: true },
    li2018: { m: 311, t: 'Li Y et al. Impact of healthy lifestyle factors on life expectancies in the US population.', j: 'Circulation 2018;138:345-55', url: doi('10.1161/CIRCULATIONAHA.117.032047') },
    nguyen2024: { m: 312, t: 'Nguyen XMT et al. Lifestyle factors and life expectancy in the Million Veteran Program (8 facteurs).', j: 'Communication NUTRITION 2023 / matrice [312]', url: '', verify: true },
    li2020: { m: 318, t: 'Li Y et al. Healthy lifestyle and life expectancy free of cancer, cardiovascular disease, and type 2 diabetes: prospective cohort study.', j: 'BMJ 2020;368:l6669', url: doi('10.1136/bmj.l6669') },
    nyberg2020: { m: 319, t: 'Nyberg ST et al. Association of healthy lifestyle with years lived without major chronic diseases.', j: 'JAMA Intern Med 2020;180:760-8', url: doi('10.1001/jamainternmed.2020.0618') },

    fadnes2022: { t: 'Fadnes LT et al. Estimating impact of food choices on life expectancy: a modeling study.', j: 'PLoS Med 2022;19:e1003889', url: doi('10.1371/journal.pmed.1003889') },
    soltani2019: { t: 'Soltani S et al. Adherence to the Mediterranean diet in relation to all-cause mortality: a systematic review and dose-response meta-analysis of prospective cohort studies.', j: 'Adv Nutr 2019;10:1029-39', url: 'https://www.sciencedirect.com/science/article/pii/S2161831322004422' },
    wang2021: { t: 'Wang DD et al. Fruit and vegetable intake and mortality: results from 2 prospective cohort studies of US men and women and a meta-analysis of 26 cohort studies.', j: 'Circulation 2021;143:1642-54', url: doi('10.1161/CIRCULATIONAHA.120.048996') },
    aune2016wg: { t: 'Aune D et al. Whole grain consumption and risk of cardiovascular disease, cancer, and all cause and cause specific mortality.', j: 'BMJ 2016;353:i2716', url: doi('10.1136/bmj.i2716') },
    aune2016nuts: { t: 'Aune D et al. Nut consumption and risk of cardiovascular disease, total cancer, all-cause and cause-specific mortality.', j: 'BMC Med 2016;14:207', url: doi('10.1186/s12916-016-0730-3') },
    schwingshackl2017: { t: 'Schwingshackl L et al. Food groups and risk of all-cause mortality: a systematic review and meta-analysis of prospective studies.', j: 'Am J Clin Nutr 2017;105:1462-73', url: doi('10.3945/ajcn.117.153148') },
    malik2019: { t: 'Malik VS et al. Long-term consumption of sugar-sweetened and artificially sweetened beverages and risk of mortality in US adults.', j: 'Circulation 2019;139:2113-25', url: doi('10.1161/CIRCULATIONAHA.118.037401') },
    lane2024: { t: 'Lane MM et al. Ultra-processed food exposure and adverse health outcomes: umbrella review of epidemiological meta-analyses.', j: 'BMJ 2024;384:e077310', url: doi('10.1136/bmj-2023-077310') },
    poole2017: { t: 'Poole R et al. Coffee consumption and health: umbrella review of meta-analyses of multiple health outcomes.', j: 'BMJ 2017;359:j5024', url: doi('10.1136/bmj.j5024') },
    mujcic2016: { t: 'Mujcic R, Oswald AJ. Evolution of well-being and happiness after increases in consumption of fruit and vegetables.', j: 'Am J Public Health 2016;106:1504-10', url: doi('10.2105/AJPH.2016.303260') },

    balaj2024: { t: 'Balaj M et al. Effects of education on adult mortality: a global systematic review and meta-analysis.', j: 'Lancet Public Health 2024;9:e155-65', url: doi('10.1016/S2468-2667(23)00306-7') },
    stringhini2017: { t: 'Stringhini S et al. Socioeconomic status and the 25 × 25 risk factors as determinants of premature mortality: a multicohort study and meta-analysis of 1.7 million men and women.', j: 'Lancet 2017;389:1229-37', url: doi('10.1016/S0140-6736(16)32380-7') },
    chenhoek2020: { t: 'Chen J, Hoek G. Long-term exposure to PM and all-cause and cause-specific mortality: a systematic review and meta-analysis (revue OMS).', j: 'Environ Int 2020;143:105974', url: doi('10.1016/j.envint.2020.105974') },
    pilling2016: { t: 'Pilling LC et al. Longer-lived parents and cardiovascular outcomes: 8-year follow-up in 186,000 UK Biobank participants.', j: 'J Am Coll Cardiol 2016;68:1702-4', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12159424/' },

    buecker2021: { t: 'Buecker S et al. Physical activity and subjective well-being in healthy individuals: a meta-analytic review.', j: 'Health Psychol Rev 2021;15:574-92', url: doi('10.1080/17437199.2020.1760728') },
    killingsworth2023: { t: 'Killingsworth MA, Kahneman D, Mellers B. Income and emotional well-being: a conflict resolved.', j: 'PNAS 2023;120:e2208661120', url: doi('10.1073/pnas.2208661120') },
    khoury2015: { t: 'Khoury B et al. Mindfulness-based stress reduction for healthy individuals: a meta-analysis.', j: 'J Psychosom Res 2015;78:519-28', url: doi('10.1016/j.jpsychores.2015.03.009') },
    white2019: { t: 'White MP et al. Spending at least 120 minutes a week in nature is associated with good health and wellbeing.', j: 'Sci Rep 2019;9:7730', url: doi('10.1038/s41598-019-44097-3') },

    insee2025: { t: 'INSEE. Bilan démographique 2025 (espérance de vie à la naissance : F 85,9 ans, H 80,3 ans).', j: 'Insee Première n° 2087, janvier 2026', url: 'https://www.insee.fr/fr/statistiques/8719824' },
    who_hale: { t: 'OMS. Global Health Estimates — healthy life expectancy (HALE). France 2021 : H 71,3, F 74,4.', j: 'WHO GHO', url: 'https://www.who.int/data/gho/data/themes/mortality-and-global-health-estimates/ghe-life-expectancy-and-healthy-life-expectancy' },
    matrice: { t: 'Matrice de paramétrage — Simulateur d\'outcomes selon habitudes de vie et paramètres cliniques (document de travail source du projet).', j: 'Document interne', url: '' }
  };
})(typeof window !== 'undefined' ? window : globalThis);
