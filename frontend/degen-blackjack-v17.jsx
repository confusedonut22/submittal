import { useState, useEffect, useCallback, useRef } from "react";

/* DEGEN BLACKJACK v17 — FINAL PROTOTYPE
   Chad Labs intro + Green felt + Caveat cream font everywhere
   Chip betting + Multi-hand + Facts + Bad beats + Sounds
   Stake-standard payouts: PP 25/12/6, 21+3 100/40/30/10/5 */

const IMG_CHIP50C="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAwADADASIAAhEBAxEB/8QAGgAAAwADAQAAAAAAAAAAAAAAAAQHAgMGBf/EAC0QAAIBBAIAAwcEAwAAAAAAAAECAwAEBRESIQYxcRMyQVFSkcEUIkJhU3KC/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAL/xAAaEQEAAwADAAAAAAAAAAAAAAAAAREhEiJB/9oADAMBAAIRAxEAPwCYUUV1Vh4Kyk+EhyyxoySnYjZgpVP8h31r8d0HgWmLyF8OVnY3M6/OOJmH3Aou8ZkLEbvLG5gHzkiZR9yKrmKhubXCRYSZBeQspLTLJxCAnYCgbJ0e9nVGViubnCS4SGNbOEKCkzScg6g7IYHRGz3sbptq68bvUYorqsh4KycGEmyxiRUiO2jVgxZPrGutfjuuVokxYQC6yFtbk6E0qoT6kCrPkcjZXtoMasM0cftmgCMvEN7MA6/1/r71FLeVoLiOZPejYMPUHdXDJZC1vfD9tkLZoC9xpoEdgpkZveQH6vMeo7p6qJipuNaMll58DcMhSFLNIywLwvyncIWKhx+0E+XfyNEGblvpzjru2R5i0WpY9qqiSPn8d9jsa+OqyjtMVcTtLk4pBKx5ukjExs3DhyK/A8evl5/Gt8JsMbBLFixJLNMBykYljpV4r2fPQGgKJI22bxuLtlxU8UzxvKISioWVFcEn/nvy/vryqP39v+lyFzbA79jK0e/Qkfirdjby2tMBPkbwQBrcl5UVgxjZd8VJ+vvXqdCobcTNcXEs7+9I5c+pO6DXTEV1IqLG7M0ab4qT0u/PVL0UFRxN3YXHhaKdLq0us5Gh9mbiXg8ez0u/5ADvR3s1ll7vH23heW4a6tLTNyIOZt5ubvo9qD/HY70NaNSyigakvZjFJDHIyxSa5qD0+vLYpWiig//Z";
const IMG_CHIP1="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAwADADASIAAhEBAxEB/8QAGwAAAQUBAQAAAAAAAAAAAAAABwABBAUGAgP/xAArEAABAwMDBAECBwAAAAAAAAABAgMEAAUREiExBhNBUXEVYRQiIzJCkaH/xAAXAQEBAQEAAAAAAAAAAAAAAAACAQQD/8QAIhEAAQQBBAIDAAAAAAAAAAAAAQACAxESBCExQRSRYXHh/9oADAMBAAIRAxEAPwAYU6UqWoJSCSeAKQBJAHJrX9P2eKY8lUiV2Hm2wsK7ZUFHONO3yAB5NFzqWjTwGUknYDkqHD6Ku0m1/UnFRo8TGdbrm+M44SCeaeb0TdYtrFyQuLIinGFNOEE744UAeaI9qhz2YghQVpXCyS53GwSsnkZOwH2ANPdoE+RG/CTVhMQEFsIbAKSBgDI2I52IqW5XGHKrNXz8euUFFoW2socSUqHIIwRXNba+WiGuJG7MrvPuIJ1dso7ZBxpOf6I8VilJKFFKhhQOCD4qtdamo05iIINg8FXXR7TbvUsXvRlSkN63CwlIUXNKSQADzuBW/hFh5uKPpAguyf1HOdIKVBIKAc7YUfXmhjaLg9armxOjEB1lWQSMjcYO3waI1on3W6xpT7jokJbKFlbqwnAJxpT69jxkY81HEAhKGNzmOIOw6taV64SI3UjFtacSiKQEJS0gLKVFJP5wdx7Chke69OlpMi5RLkme8X9E1xkFQAwkYAGBXrHu7APanpLchKdPcSMkg+dtxUaK7AtweYswdLkhRcWXHFEajyrCjzSWalR3BUeO5JBtInLYSHAASAVFekqVj7Af5WD63ZbZ6nklqOYyXUtu9kpwWypAJBHvOa290m3a2MRZDbiWEuqWUrbWlWwP7Ve/Z8bgeKHN9ubt4vEie+QVukDYYGAABt8Ci0gkrTNG9sbXE7Hq/ar6nQbiuMO2vKmz4zUGlSIBFFcYpXxOyYd0X7JItj/TLTsd6HIuqEFSDIVhSCf4552Hjiur29bWOmXX3noUa6LQlThYWNSyOU553Hjig9So4BdPJfeXd3+fSsp90U+jss5S3881W0qVJrQ0UEJZnzOyeV//2Q==";
const IMG_CHIP5="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAwADADASIAAhEBAxEB/8QAGgABAAIDAQAAAAAAAAAAAAAABgABAwQFB//EACsQAAEDAwMEAgEEAwAAAAAAAAECAwQABRESITEGE0FhFFFxIoGRoTJDkv/EABcBAQEBAQAAAAAAAAAAAAAAAAIBAwD/xAAgEQEAAgMAAgIDAAAAAAAAAAABAAIDERIhYSIxQYGh/9oADAMBAAIRAxEAPwD0uoSEgkkADck+Kh2GTQG6XVHUcuXDE5USCwgqbIQSl4g8rI8fQ91pjxt31Da3Mau3GG1CMxclv4w/2g5Tzjke6jdwhuw0zEyW/jK4dUdKeccn3Rmzwp0aEbdFS3JhEnuFxOdRI3AzsBn81LxCmy4Yt8wNx4YILZbTjBA2ScbEfxU5O9b8RdHH18v5F4IIBByDuCKugNquyOnZkSCqcuXCfbClqKCEsqJ2KCd9P2PGKfc1cmNo+oa26mGWvtxHl9pT2lBPbQMle3A9nihMJUORHjOIsxtzstSipJOUjQoYI9fq9bj1TWcHzCf+Ljv6CW9QyNWNs/vQG03K83dE1T6g6GUhRU7hCUEHdPjBP9EVcdVFGS6CDO7OuU2He12+JhTIjqDLTISSFhBI1A7jfGFDI8HeqsL6zcZNpusi4uyiwlwNy+2UlGcEpKPOfutlVwhSo7tvuqEqUtrtuadypCh63Ga1WlW+JLcVb1OvT3Wu33X3MqS2nwkHx+35rPTHucyaqGxGkOLspuLsRacJB/Sdajkn/n3ufdOIq+5FaX2lNakA9tQwUbcH2K8+u1zvVoTCLCktB5BUFNaVpXk/4+ckD+SafQQ+ILHysd/QC5gYGrz/AHWmStgFYKIqTPQ3qrpJ6U65Os+A65u9HKtIdP2Dxn0dvxTKpQpdo7IrVLGmDbXGEPptKHWWzdkgrQmWkpLZ8JST9D6OM1d2iCX04pLDLabqoBbiYiSoungpJHO32cZFMfRq/Fd3bvrcXjjjX7/MFdK9IvxnWp14x3Gt2Y+rUGzzknjPobed6a1KlW927thrUqaJ/9k=";
const IMG_CHIP25="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAwADADASIAAhEBAxEB/8QAGwAAAgMAAwAAAAAAAAAAAAAABgcAAQMCBAX/xAApEAABAwMEAgICAgMAAAAAAAABAgMEAAUREiExQQYTYYEiURQzUnHB/8QAFgEBAQEAAAAAAAAAAAAAAAAAAQAC/8QAGxEBAAICAwAAAAAAAAAAAAAAABESAiEiYaH/2gAMAwEAAhEDEQA/AGZVKUEpKlEAAZJJ2FXS4ul8jeSXWXb35Mli2stq9foTn2LBwCsckE7BPdRHT13t7MAz1SkKihWn2o/NOc46+ajN3t70AT0ykJilWkOr/AZzjv5oXsNnnx7cYkJxKoLhKl/yEAhwkYOOcJ26H3Uv1mnybeIk11KYLZCkfx0ABsgYGRtlO/Y+6Ny1OFe/BolQUkKSQQRkEb5q6W9svsfxu7RLfHkSn7a+2n2e9OPWsnBKByADkFPW9MillweUtLK1NpClgHSknAJ6GeqD1LlyRb03u3R40uQ4r2Kb/wAQtIGTyDhR7+e6LZiXlQnkxiA+UH1lXGrG2fvFLOzXG+XmVNEuU2oMMlaxIUGw2UncADjggnrY9bwe9MlT02+aiRMkR3w8tuEG1BlLqiPx5AISgc7kd5PFauyZTFyt0iZMelRJTjMZJjSEhtay3uVN6d0k5PPGNq1TdrVNSwzeo0aS6EZbUpCHNQPYB/1vjI2qpV1tKHlm3xozcttvd5SEpU0kDH1tgb4/5UnWQuZGE9Nkt0eTLjuI0Kc50qUoHB5zhI7+etzFlSlMoLiQlZH5AHIB7Ge6V96uN9s0qEmJKbSHmQtAjqDiXCTsCDzyAD3ue9mbCS8mEwJJBf0D2aeNWN8feak2oJ8v8LVcH3LjaNCZK/7mFHSl0/sHpX76NG9VUQTYoCrZ4ouMW0s3JwqcxKbyEK4GORwOfmpfoCrp4qiMlpL1xbKXNMVvAWrg54HB5+KNqlEbk241gE+IeFqt77dxu+hUlH9LCTqS0f2T2r9dCjapUpD/2Q==";
const IMG_CHIP100="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAwADADASIAAhEBAxEB/8QAGwAAAgIDAQAAAAAAAAAAAAAAAAYCBQEDBAf/xAArEAACAQMCBQMDBQAAAAAAAAABAgMABBESIQUxQVFhEyIyUnHRFEORobH/xAAXAQEBAQEAAAAAAAAAAAAAAAADBAAB/8QAHxEAAgMAAQUBAAAAAAAAAAAAAQIAAxESBBMUITFh/9oADAMBAAIRAxEAPwD02sEgAkkADqaCQBknAFUF9fC5d1MjJCo9uFzqPmhvvFQ/YiIXMtbjiNnbWzXE06rCvN+YG+P9qVvf2tzbJcQyhoX+L4IB3xVFbw3c0bxRKjwN89QGG2wRk/itk0d3EipOqrCvx0gYXbYbfip+/dx5cYvbr+b7jCCCMg5FZqhs74W8qqHZ4GAzkYwfFXoIIyNwaopuFo/RCdCpmq6Om3bC6s7Y7+KW5W1pCZbQQNIxyB0wRv8AwTTHeJJJaSLDj1NOUz9Q3FLQkmvYpSJAw0ave2AMHl47eDUvWHHXYtI0GdUl3cWoSIsyjLDcAe0FRkDmMZNT/WSSM8bMWUMEQH9wFyp+9Qt+MCLTFdx63AGGUAkj7UXPGVlUw20ehgD7mwCo8DpXSVzlzmw/MnPDKYxMI7UTtHgjPkkZ/qmW2YtApK6T27eKVfUnskjdpAupNQKHIx289vJNM9isq2cQnGJSuXHYnc1zozrtk1wwCdFL/FeCyid7vhyqxc6pICcaj9SnofHI0wUVbZUti8Wgq5U6IrN7OFPGiCK8KkqLmM4VqCvq8MjT0xLeKAWFtGcMetNFFS+EuZvqL5Bz5KDhPBZvXW64iFXQcxwKdWD3Y9T45CmCiiqq6lrXisJnLHTP/9k=";
const IMG_LOGO="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCABQAFADASIAAhEBAxEB/8QAGwAAAgIDAQAAAAAAAAAAAAAAAAIBBgMFBwT/xAAvEAABBAECBAQFBAMAAAAAAAABAAIDBBEFEgYTITEUIkFRMmFxkdEHI0KBFVKx/8QAGAEAAwEBAAAAAAAAAAAAAAAAAAECAwT/xAAiEQACAwACAQQDAAAAAAAAAAAAAQIDEQQSFAUTITFBYZH/2gAMAwEAAhEDEQA/AOZoQhWIFKFOFWARhGE2EYTwBVCbCjCWAQhThQpAFlhhlneGQxvkef4saSVjC6ppNGPh7h/xNUQy2HR73nGXZwseReqUvjWzSEO7OcT6XqFZgfYpWI2f7OjICR9K3HHzJKszWAZ3OjIGPqrRBx9qRke26xk1aQEFoHmAPqMq1X6s2rcG16taWEukjaWl7g37rKfKsqaVkc0pVxl9M5d4Ozyub4abllu7fsOMe+fZRFUsTtLoYJZADgljCQD/AEuj3mS6f+n8mn2Q3mRxYL2nIJ9gVn4VfW4f02pVsYFi6S94I6525wPoEecnByS/OB7L3DlzYJZJeVHE90mcbA0k/ZO+hdZ8VOwPrE78K4WK0VDjiG1A4eHnLn/Q+o/4tlxVxfZp2Kxouj5cgPMaW57Y/KHzJSlFQW6tD2cTbOaOaWkhwII9CMJV1DWdK0/WtE8XIY4Lwj3gAAfdcwWvHvV0W8xomyHRgFeNDuNuOic2y3AaGyQvdjacYP8AR9D81RwnB+QTv46ujm4Fdjgy4T8P6Zp1gzvsc+NpyInENYPkXeoWW/elh0yeJmWw8logx0LD07H7qv6TRbqMd573Nb4Sq+wMgu3bSPL36d+6w1P37EcENGGaWRwaxg3ZcT2HxKFwpTadk9z9D8hRTUYltoWTa0yvBZjdJDyA5x7uc4fkrDa4qbDa2SUhM6HoHHHlPqBnqFi1bSotJqeJipVLbIpOTZJilYI5Menm8zT1Ad7hbWXhqi68yoIGNc/b+42DyDcAfWbdjr7Ij6dV2bm9X8JfLliSRkl1CtelrzSwZ2+Zrx/IEditdrNXTtXtQSB0lZsed7Czdu+h9F5q/D9SxTZM4tMjnva6OswHl7XY82+VpBPfGOy0GsVP8fffWEUrA0Ajms2OOR7BxGPoVnH051vYT+jTyoyWOJYdau1YJHziXqW4ZED8RxgZHt+FS0xx6ABKV0UUKmObpFljsZATBImC2Rme7TtSs6bK+Sq5oMjDG9r2B7XNPcEHoey9bdfvNlbLE2pDI1rg18NZjHDcMEggd8evotOCmBVpktI2cetakyOaJ1yWWOaMxvZM4yNLT8ndj816XcS6g6dth7KLp24xK6nGXgjsckZyMBaTKMqtF1RtBrloA8yGlM5zi5z5qkcj3EnJJcRk9SvHqOoWdRs8+28PftDRhoaGtAwAAOgAXmJSkpNjSQFKVJSrNsoEIQpAnKnKVTlVoDZRlLlGU9AbKjKjKhLQJyoQhID/2Q==";
const CHIPS=[{v:500000,l:"50c",img:IMG_CHIP50C},{v:1000000,l:"$1",img:IMG_CHIP1},{v:5000000,l:"$5",img:IMG_CHIP5},{v:25000000,l:"$25",img:IMG_CHIP25},{v:100000000,l:"$100",img:IMG_CHIP100}];

const FACTS=[
"Octopuses have been observed punching fish during cooperative hunts. Literally punching them.",
"Dolphins have individually distinctive signature whistles that function like names.",
"Crows can remember your face for years after a single bad interaction. They hold grudges.",
"Wombats produce cube-shaped poop because of the mechanical properties of their intestines.",
"Some turtles can extract oxygen underwater through cloacal respiration. Yes, through the butt.",
"Male seahorses carry the embryos and give birth. The males got the difficult end of the contract.",
"Rats emit ultrasonic chirps when tickled. Researchers treat it as a laughter-like response.",
"Goats develop group-specific vocal patterns. Basically accents.",
"Chimpanzees cache stones to throw at zoo visitors later. Premeditated monkey hostility.",
"The alpha wolf concept was challenged by the same researcher who popularized it.",
"Lightning can fuse sand into glassy structures called fulgurites.",
"Some sand dunes produce a low droning sound when dry grains avalanche in sync.",
"Lake Natron in Tanzania is so alkaline that dead animals become preserved and appear stone-like.",
"Trees send chemical and electrical warning signals about drought or insect attacks.",
"Your brain actively fills in your visual blind spot so you never notice it.",
"Aphantasia is a condition where people cannot voluntarily generate mental images at all.",
"People systematically overestimate how much others notice their appearance. The spotlight effect.",
"False memories can be implanted experimentally. Human memory is a corrupt narrator.",
"Unfinished tasks stick in your head more than completed ones. The Zeigarnik effect.",
"Napoleon was overwhelmed during a rabbit hunt when the rabbits charged him instead of scattering.",
"The shortest recorded war lasted less than 40 minutes. Anglo-Zanzibar War, 1896.",
"In medieval Europe, animals were put on trial in human courts. Pigs and rats got lawyers.",
"The earliest known vending machine dispensed holy water in the first century.",
"Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
"Bees can be trained to recognize human faces despite brains the size of poppy seeds.",
"Elephants communicate through very low-frequency sounds and ground vibrations over long distances.",
"Selecting only for tameness in foxes rapidly changed not just behavior but physical traits too.",
"Koalas have such a nutritionally poor diet they rely on enormous hindgut fermentation.",
"Parasitoid wasps lay eggs inside other animals and the larvae eat the host alive.",
"Your brain edits out your nose from your vision at all times. You are looking at it right now.",
"You cannot hum while holding your nose closed.",
"Your brain can delay pain signals in extreme situations.",
"Stress sweat has a different chemical signature. Humans can literally smell fear.",
"You are slightly taller in the morning because your spine decompresses overnight.",
"Your body replaces most of your skeleton roughly every 10 years.",
"There are mites living in your eyelashes right now eating oils and dead skin.",
"Your brain uses about 20 percent of your total energy while doing absolutely nothing.",
"There are parasites that make ants climb to high places and clamp down before dying.",
"Sloths sometimes die because they mistake their own arm for a tree branch and fall.",
"Sharks can detect a heartbeat through electrical signals in the water.",
"Pinecones open and close based on humidity levels.",
"Some mushrooms glow in the dark. Bioluminescent fungi are real.",
"There is a jellyfish that can revert to its younger form instead of dying. Biologically immortal.",
"A single cloud can weigh over a million kilograms and still float.",
"There are places where it rains fish due to waterspouts picking them up from the ocean.",
"People used to wash clothes with urine because of its ammonia content.",
"Europeans once genuinely feared tomatoes were poisonous.",
"Vikings used cats on ships to control rat populations.",
"Ancient Romans used crushed mouse brains as toothpaste.",
"The inventor of the Pringles can is buried in one.",
"You can die from drinking too much water. It is called hyponatremia.",
"There are more trees on Earth than stars in the Milky Way.",
"A day on Earth used to be significantly shorter hundreds of millions of years ago.",
"Petrichor is the name for the smell of rain on dry earth.",
"Some metals like sodium explode violently when they touch water.",
"There are fish that can walk on land for extended periods.",
"Your stomach gets a new lining every few days so it does not digest itself.",
"There are people with a rare condition who feel no pain at all.",
"You can start hallucinating from sleep deprivation within just a few days.",
"Your brain is more active during dreaming than while watching television.",
"Some parasites require multiple hosts and manipulate behavior at each stage.",
"Capgras delusion makes people believe their loved ones have been replaced by imposters.",
"Prosopagnosia is a condition where you completely lose the ability to recognize faces.",
"Some people remember every single day of their life in extraordinary detail. Hyperthymesia.",
"Honey never spoils. Archaeologists found 3000-year-old honey that was still edible.",
"A group of flamingos is called a flamboyance.",
"The dot over i and j is called a tittle.",
"Scotland's national animal is the unicorn.",
"Bananas are technically berries. Strawberries are not.",
"There are more possible chess games than atoms in the observable universe.",
"Oxford University is older than the Aztec Empire.",
"The speed of a computer mouse is measured in Mickeys.",
"A jiffy is an actual unit of time. One trillionth of a second.",
"Maine is the closest US state to Africa.",
"Russia has a larger surface area than Pluto.",
"An octopus has three hearts and blue blood.",
"There is a basketball court on the top floor of the US Supreme Court building.",
"A group of porcupines is called a prickle.",
"Astronauts grow up to 2 inches taller in space.",
"The Hawaiian alphabet has only 13 letters.",
"The average person walks the equivalent of five times around the Earth in their lifetime.",
"Venus is the only planet that spins clockwise.",
"A bolt of lightning is five times hotter than the surface of the sun.",
"A cockroach can live for weeks without its head before starving.",
"Your heart beats around 100,000 times per day.",
"The Eiffel Tower can grow up to 6 inches taller in summer due to thermal expansion.",
"Polar bear fur is transparent and appears white because it reflects light.",
"The longest English word without a true vowel is rhythm.",
"Cows have best friends and get stressed when separated from them.",
"The Great Wall of China is not visible from space with the naked eye.",
"Hot water can freeze faster than cold water under certain conditions. The Mpemba effect.",
"Butterflies taste with their feet.",
"A snail can sleep for three years straight.",
"The total weight of all ants on Earth roughly equals the total weight of all humans.",
"Your nose can detect over 1 trillion different scents.",
"Sea otters hold hands while sleeping so they do not drift apart.",
"The shortest complete sentence in English is Go.",
"There are more fake flamingos in the world than real ones.",
"Humans share about 60 percent of their DNA with bananas.",
"The average person spends 6 months of their lifetime waiting for red lights.",
"Cats have over 20 different vocalizations including at least 100 different meow sounds.",
"There is a species of ant that explodes itself to protect its colony.",
"The longest hiccupping spree lasted 68 years.",
"Water can boil and freeze at the same time under specific pressure conditions. The triple point.",
"Some species of bamboo can grow up to 35 inches in a single day.",
"There is a town in Norway called Hell and it freezes over every winter.",
"The longest time between two twins being born is 87 days.",
"A flea can jump up to 150 times its own body length.",
"The inventor of the fire hydrant is unknown because the patent was destroyed in a fire.",
"More people are killed by vending machines each year than by sharks.",
"Your brain generates enough electricity to power a small light bulb.",
"There are more stars in the universe than grains of sand on all of Earth's beaches.",
"An adult human body contains approximately 7 octillion atoms.",
"The oldest known joke is a Sumerian fart joke from 1900 BC.",
"A blue whale heart is so large a small child could swim through its arteries.",
"Saudi Arabia imports camels from Australia.",
"The average person will spend about 26 years sleeping in their lifetime.",
"Humans are the only animals whose brains shrink as they age.",
"There is a species of shrimp that snaps its claw so fast it creates a bubble hotter than the Sun.",
"A group of owls is called a parliament.",
"The original name for Google was Backrub.",
"A day on Venus is longer than a year on Venus.",
"The total length of all blood vessels in the human body is about 60000 miles.",
"Peanuts are one of the ingredients in dynamite.",
"If you could fold a piece of paper 42 times it would reach the moon.",
"There are more bacterial cells in your body than human cells.",
"The average person produces enough saliva in their lifetime to fill two swimming pools.",
"Pigeons can do math at roughly the same level as primates in certain experiments.",
"A teaspoon of neutron star material would weigh about 6 billion tons.",
"The last letter added to the English alphabet was J.",
"Humans glow in the dark but the light is 1000 times weaker than what our eyes can detect.",
"The chance of you existing at all is roughly 1 in 10 to the power of 2685000.",
];
const rFact=()=>FACTS[Math.floor(Math.random()*FACTS.length)];
const BB1=["RIGGED","House always wins","You gotta be kidding","That is criminal"];
const BB2=["Close but no cigar","Almost had it","So close yet so far","Pain."];
const BB3=["One too many","Should have stood","That last card was personal"];
const BB4=["Full send into a wall","Doubled down on disaster","Aggressive and wrong"];
const BB5=["At this point it is personal","The table hates you","Maybe try checkers","Down bad"];
const BB6=["Tough break","Dealer got lucky","Not your round","It happens"];
const rBB=(a)=>a[Math.floor(Math.random()*a.length)];
function getBB(pV,dV,bust,dbl,streak){if(dbl)return rBB(BB4);if(pV===20&&dV===21)return rBB(BB1);if(pV>=19&&dV>pV)return rBB(BB2);if(bust&&pV===22)return rBB(BB3);if(streak>=5)return rBB(BB5);if(Math.random()<.15)return rBB(BB6);return null;}
let aC=null;
function sC(){try{if(!aC)aC=new(window.AudioContext||window.webkitAudioContext)();const b=aC.createBuffer(1,aC.sampleRate*.08,aC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++){d[i]=(Math.random()*2-1)*Math.exp(-(i/d.length)*30)*.3;}const s=aC.createBufferSource();s.buffer=b;const f=aC.createBiquadFilter();f.type="bandpass";f.frequency.value=2000;f.Q.value=1;const g=aC.createGain();g.gain.value=.4;s.connect(f);f.connect(g);g.connect(aC.destination);s.start();}catch(e){}}
function sD(){try{if(!aC)aC=new(window.AudioContext||window.webkitAudioContext)();const b=aC.createBuffer(1,aC.sampleRate*.15,aC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++){const t=i/d.length;d[i]=(Math.random()*2-1)*Math.exp(-t*15)*(1-t)*.25;}const s=aC.createBufferSource();s.buffer=b;const f=aC.createBiquadFilter();f.type="lowpass";f.frequency.value=3000;const g=aC.createGain();g.gain.value=.5;s.connect(f);f.connect(g);g.connect(aC.destination);s.start();}catch(e){}}
const C={bg:"#071a0e",felt:"#0c2616",fl:"#153d24",sf:"#172e20",sa:"#1d4a2c",bd:"#2a5a3a",cr:"#f2e8d0",cd:"#bfb49a",ac:"#e8d48b",gn:"#4caf50",rd:"#ef5350",gd:"#d4a840"};
const SUITS={diamonds:{s:"\u2666",r:1},hearts:{s:"\u2665",r:1},clubs:{s:"\u2663",r:0},spades:{s:"\u2660",r:0}};
const RANKS={A:{l:"A",v:11},2:{l:"2",v:2},3:{l:"3",v:3},4:{l:"4",v:4},5:{l:"5",v:5},6:{l:"6",v:6},7:{l:"7",v:7},8:{l:"8",v:8},9:{l:"9",v:9},10:{l:"10",v:10},J:{l:"J",v:10},Q:{l:"Q",v:10},K:{l:"K",v:10}};
const RO=["A","2","3","4","5","6","7","8","9","10","J","Q","K"],SO=["diamonds","hearts","clubs","spades"];
const fmt=a=>(a/1e6).toFixed(2);
const SP={n:{n:"1x",d:400,dr:450,r:700,b:1e3},f:{n:"2x",d:180,dr:200,r:350,b:500},t:{n:"5x",d:50,dr:60,r:120,b:250},m:{n:"Max",d:0,dr:0,r:20,b:80}};
const PH={BET:0,DEAL:1,PLAY:2,DLR:3,RES:4,INS:5,INTRO:6};
function mkS(n){let s=[];for(let d=0;d<n;d++)for(const u of SO)for(const r of RO)s.push({rank:r,suit:u});for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];}return s;}
function hv(h){let v=0,a=0;for(const c of h){v+=RANKS[c.rank].v;if(c.rank==="A")a++;}while(v>21&&a>0){v-=10;a--;}return v;}
function isSoft(h){let v=0,a=0;for(const c of h){v+=RANKS[c.rank].v;if(c.rank==="A")a++;}while(v>21&&a>0){v-=10;a--;}return a>0;}
function e21(a,b,c){const rks=[a,b,c].map(x=>RO.indexOf(x.rank)).sort((a,b)=>a-b);const ss=[a,b,c].map(x=>x.suit);const as2=ss[0]===ss[1]&&ss[1]===ss[2];const ar=a.rank===b.rank&&b.rank===c.rank;const seq=(rks[2]-rks[1]===1&&rks[1]-rks[0]===1);if(ar&&as2)return{w:1,n:"Suited Trips",m:100};if(seq&&as2)return{w:1,n:"Str Flush",m:40};if(ar)return{w:1,n:"3 of a Kind",m:30};if(seq)return{w:1,n:"Straight",m:10};if(as2)return{w:1,n:"Flush",m:5};return{w:0};}
function ePP(a,b){if(a.rank!==b.rank)return{w:0};if(a.suit===b.suit)return{w:1,n:"Perfect Pair",m:25};if(SUITS[a.suit].r===SUITS[b.suit].r)return{w:1,n:"Coloured Pair",m:12};return{w:1,n:"Mixed Pair",m:6};}
function mkH(b){return{cards:[],bet:b||1000000,sb:{t:false,pp:false},res:null,msg:"",pay:0,done:false,dbl:false};}
const CW=64,CH=90;
function Card({card,hidden,idx,small}){const w=small?50:CW,h=small?70:CH,dl=idx*.06;if(hidden)return(<div style={{width:w,height:h,borderRadius:7,animation:`ci .22s ease ${dl}s both`,background:"linear-gradient(150deg,#1a3a24,#0e2214)",border:"1.5px solid #2a5a3a",boxShadow:"0 3px 12px rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}><img src={IMG_LOGO} style={{width:w*.6,height:w*.6,objectFit:"contain",opacity:.6}} alt=""/></div>);const su=SUITS[card.suit],rk=RANKS[card.rank],col=su.r?"#c62828":"#1b1b1b";const f1=small?12:15,f2=small?10:13,fc=small?22:28;return(<div style={{width:w,height:h,borderRadius:7,animation:`ci .22s ease ${dl}s both`,background:"#fff",boxShadow:"0 3px 12px rgba(0,0,0,.3)",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:small?3:5,left:small?4:6}}><div style={{fontSize:f1,fontWeight:800,color:col,lineHeight:1,fontFamily:"Georgia,serif"}}>{rk.l}</div><div style={{fontSize:f2,lineHeight:1,color:col,marginTop:-1}}>{su.s}</div></div><div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:fc,color:col}}>{su.s}</div><div style={{position:"absolute",bottom:small?3:5,right:small?4:6,transform:"rotate(180deg)"}}><div style={{fontSize:f1,fontWeight:800,color:col,lineHeight:1,fontFamily:"Georgia,serif"}}>{rk.l}</div><div style={{fontSize:f2,lineHeight:1,color:col,marginTop:-1}}>{su.s}</div></div></div>);}
function ChipStack({bet}){if(bet<=0)return null;const dn=[100000000,25000000,5000000,1000000,500000];const cc={"500000":"#555","1000000":"#c62828","5000000":"#1565c0","25000000":"#333","100000000":"#b8860b"};let rem=bet;const st=[];for(const d of dn){while(rem>=d&&st.length<6){st.push(d);rem-=d;}}return(<div style={{position:"relative",height:Math.min(st.length*4+18,42),width:32,margin:"0 auto"}}>{st.map((d,i)=>(<div key={i} style={{width:28,height:7,borderRadius:14,background:cc[d]||"#666",border:"1px solid rgba(255,255,255,.15)",boxShadow:"0 1px 2px rgba(0,0,0,.3)",position:"absolute",bottom:i*4,left:2,zIndex:i}}/>))}<div style={{position:"absolute",bottom:st.length*4+2,left:"50%",transform:"translateX(-50%)",fontSize:13,fontFamily:"'Caveat',cursive",fontWeight:700,color:C.cr,whiteSpace:"nowrap"}}>${fmt(bet)}</div></div>);}
function Ghost({onClick}){return(<div onClick={onClick} style={{width:CW,height:CH,borderRadius:7,border:"2px dashed rgba(242,232,208,.15)",background:"rgba(242,232,208,.03)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}><span style={{fontSize:22,color:C.cr,opacity:.2,fontFamily:"'Caveat',cursive"}}>+</span></div>);}

export default function App(){
  const [phase,setPhase]=useState(PH.INTRO);
  const [introOp,setIntroOp]=useState(1);
  const [bal,setBal]=useState(100000000);
  const [shoe,setShoe]=useState(()=>mkS(6));
  const [dH,setDH]=useState([]);
  const [hands,setHands]=useState([mkH(1000000)]);
  const [nSlots,setNSlots]=useState(1);
  const [actH,setActH]=useState(-1);
  const [pend,setPend]=useState(null);
  const [msg,setMsg]=useState("");
  const [fact,setFact]=useState(rFact());
  const [lStrk,setLStrk]=useState(0);
  const [showR,setShowR]=useState(false);
  const [showA,setShowA]=useState(false);
  const [auto,setAuto]=useState(false);
  const [aSpd,setASpd]=useState("n");
  const [aN,setAN]=useState(0);
  const [aMax,setAMax]=useState(50);
  const [maxH,setMaxH]=useState(2);
  useEffect(()=>{const c=()=>setMaxH(window.innerWidth>=600?4:2);c();window.addEventListener("resize",c);return()=>window.removeEventListener("resize",c);},[]);
  // Intro timer
  useEffect(()=>{if(phase===PH.INTRO){const t1=setTimeout(()=>setIntroOp(0),2500);const t2=setTimeout(()=>setPhase(PH.BET),3200);return()=>{clearTimeout(t1);clearTimeout(t2)};}},[phase]);
  const shR=useRef(shoe);shR.current=shoe;const auR=useRef(false);auR.current=auto;const blR=useRef(bal);blR.current=bal;const anR=useRef(aN);anR.current=aN;
  const sp=SP[aSpd];
  const draw=useCallback(()=>{let s=[...shR.current];if(s.length<52)s=mkS(6);const c=s.pop();setShoe(s);shR.current=s;return c;},[]);
  const addSlot=()=>{if(nSlots<maxH&&phase===PH.BET){setNSlots(n=>n+1);setHands(h=>[...h,mkH(h[0]?.bet||1000000)]);}};
  const rmSlot=(i)=>{if(nSlots>1&&phase===PH.BET){setNSlots(n=>n-1);setHands(h=>h.filter((_,j)=>j!==i));}};
  const togSB=(i,k)=>{if(phase!==PH.BET)return;setHands(h=>h.map((x,j)=>j===i?{...x,sb:{...x.sb,[k]:!x.sb[k]}}:x));};
  const addChip=(i,v)=>{if(phase!==PH.BET)return;setHands(h=>h.map((x,j)=>j===i?{...x,bet:x.bet+v}:x));};
  const clrBet=(i)=>{if(phase!==PH.BET)return;setHands(h=>h.map((x,j)=>j===i?{...x,bet:0}:x));};
  const evalSB=(h,dUp,dbj,ins)=>{const p1=h.cards[0],p2=h.cards[1],r=[];if(h.sb.t){const e=e21(p1,p2,dUp);r.push({b:"21+3",...e,p:e.w?e.m*100000:0});}if(h.sb.pp){const e=ePP(p1,p2);r.push({b:"Pairs",...e,p:e.w?e.m*100000:0});}if(ins)r.push({b:"Ins",w:dbj?1:0,n:dbj?"Dealer BJ":null,m:2,p:dbj?1000000:0});return r;};
  const findNx=(hs)=>{for(let i=hs.length-1;i>=0;i--)if(!hs[i].done)return i;return-1;};
  const finishR=(hs,dVal)=>{const aL=hs.some(h=>h.res==="lose"||h.res==="bust"),aW=hs.some(h=>h.res==="win"||h.res==="bj");if(aL&&!aW)setLStrk(s=>s+1);else if(aW)setLStrk(0);const h0=hs[0];if(h0&&(h0.res==="lose"||h0.res==="bust")){const pV=h0.cards.length?hv(h0.cards):0;const bb=getBB(pV,dVal,h0.res==="bust",h0.dbl&&h0.res==="bust",lStrk+(aL?1:0));if(bb){setMsg(bb);setPhase(PH.RES);return;}}const w=hs.filter(h=>h.res==="win"||h.res==="bj").length,l=hs.filter(h=>h.res==="lose"||h.res==="bust").length;setMsg(w>0&&l===0?"You Win!":(l>0&&w===0?"Dealer Wins":`${w}W ${l}L`));setPhase(PH.RES);};
  const resInit=useCallback((dc,hs,dbj,ins)=>{if(ins)setBal(v=>v-500000);let up=[...hs],sbP=0;for(let i=0;i<up.length;i++){const sbs=evalSB(up[i],dc[0],dbj,ins);for(const r of sbs)if(r.w)sbP+=r.p;const pV=hv(up[i].cards);if(pV===21&&dbj)up[i]={...up[i],res:"push",msg:"Push",pay:up[i].bet,done:true};else if(pV===21)up[i]={...up[i],res:"bj",msg:"Blackjack",pay:up[i].bet+Math.floor(up[i].bet*1.5),done:true};else if(dbj)up[i]={...up[i],res:"lose",msg:"Dealer BJ",pay:0,done:true};}if(sbP>0)setBal(v=>v+sbP);for(const h of up)if(h.done&&h.pay>0)setBal(v=>v+h.pay);setHands(up);const nx=findNx(up);if(nx>=0){setActH(nx);setPhase(PH.PLAY);}else finishR(up,hv(dc));},[]);
  const deal=useCallback(()=>{let cost=0;const nh=hands.map(h=>{let c=h.bet;if(h.sb.t)c+=100000;if(h.sb.pp)c+=100000;cost+=c;return{...h,cards:[],res:null,msg:"",pay:0,done:false,dbl:false};});if(cost>blR.current||cost<=0||nh.some(h=>h.bet<=0))return;sD();setBal(v=>v-cost);setMsg("");setPend(null);setPhase(PH.DEAL);const dc=[draw(),draw()];for(let i=0;i<nh.length;i++)nh[i].cards=[draw(),draw()];setTimeout(()=>{setDH(dc);setHands(nh);if(dc[0].rank==="A"&&!auR.current){setPend({dc,nh,dbj:hv(dc)===21});setPhase(PH.INS);}else resInit(dc,nh,hv(dc)===21,false);},auR.current?sp.d:350);},[hands,draw,sp,resInit]);
  const hIns=(a)=>{if(pend){const{dc,nh,dbj}=pend;setPend(null);resInit(dc,nh,dbj,a);}};
  const hitH=useCallback(()=>{sC();const c=draw();setHands(p=>{const hs=[...p],h={...hs[actH],cards:[...hs[actH].cards,c]};const v=hv(h.cards);if(v>21){h.res="bust";h.msg="Bust";h.done=true;}else if(v===21)h.done=true;hs[actH]=h;if(h.done){const nx=findNx(hs);if(nx>=0)setTimeout(()=>setActH(nx),150);else setTimeout(()=>stDlr(hs),200);}return hs;});},[actH,draw]);
  const stdH=useCallback(()=>{setHands(p=>{const hs=[...p];hs[actH]={...hs[actH],done:true};const nx=findNx(hs);if(nx>=0)setTimeout(()=>setActH(nx),150);else setTimeout(()=>stDlr(hs),200);return hs;});},[actH]);
  const dblH=useCallback(()=>{const h=hands[actH];if(blR.current<h.bet)return;sC();setBal(v=>v-h.bet);const c=draw();setHands(p=>{const hs=[...p],nh={...hs[actH],cards:[...hs[actH].cards,c],bet:hs[actH].bet*2,done:true,dbl:true};if(hv(nh.cards)>21){nh.res="bust";nh.msg="Bust";}hs[actH]=nh;const nx=findNx(hs);if(nx>=0)setTimeout(()=>setActH(nx),150);else setTimeout(()=>stDlr(hs),200);return hs;});},[actH,hands,draw]);
  const stDlr=useCallback((hs)=>{setActH(-1);setPhase(PH.DLR);let d=[...dH];const run=()=>{if(hv(d)<17){d=[...d,draw()];sC();setDH([...d]);setTimeout(run,auR.current?sp.dr:400);}else{const dV=hv(d);setTimeout(()=>{const fin=hs.map(h=>{if(h.res)return h;const pV=hv(h.cards);if(dV>21)return{...h,res:"win",msg:"Win",pay:h.bet*2};if(pV>dV)return{...h,res:"win",msg:"Win",pay:h.bet*2};if(pV===dV)return{...h,res:"push",msg:"Push",pay:h.bet};return{...h,res:"lose",msg:"Lose",pay:0};});let tp=0;for(let i=0;i<fin.length;i++)if(!hs[i].res&&fin[i].pay>0)tp+=fin[i].pay;if(tp>0)setBal(v=>v+tp);setHands(fin);finishR(fin,dV);},auR.current?sp.r:500);}};setTimeout(run,auR.current?sp.dr:250);},[dH,draw,sp]);
  const newR=useCallback(()=>{setPhase(PH.BET);setDH([]);setMsg("");setPend(null);setActH(-1);setFact(rFact());setHands(p=>p.map(h=>({...mkH(h.bet),sb:{...h.sb}})));},[]);
  const hBet=useCallback(()=>{if(phase===PH.RES)newR();else if(phase===PH.BET)deal();},[phase,deal,newR]);
  useEffect(()=>{if(!auto)return;if(phase===PH.BET){if(anR.current>=aMax){setAuto(false);return;}const t=setTimeout(()=>{if(auR.current){setAN(r=>r+1);deal();}},sp.b);return()=>clearTimeout(t);}if(phase===PH.INS){hIns(false);return;}if(phase===PH.PLAY&&actH>=0){const h=hands[actH];if(!h||h.done)return;const t=setTimeout(()=>{if(!auR.current)return;if(hv(h.cards)>=17)stdH();else hitH();},sp.dr);return()=>clearTimeout(t);}if(phase===PH.RES){const t=setTimeout(()=>{if(auR.current)hBet();},sp.b);return()=>clearTimeout(t);}},[auto,phase,actH,hands,sp,deal,hitH,stdH,hBet,aMax]);
  const iB=phase===PH.BET,iP=phase===PH.PLAY,iD=phase===PH.DLR,iR=phase===PH.RES,iI=phase===PH.INS;
  const lk=!iB;const dV=dH.length?hv(dH):0;const dSf=dH.length>=2&&!(iP||iI)&&isSoft(dH)&&dV<=21;
  const cH=actH>=0?hands[actH]:null;const cDb=cH&&cH.cards.length===2&&bal>=cH.bet;
  const tCost=hands.reduce((t,h)=>{let c=h.bet;if(h.sb.t)c+=100000;if(h.sb.pp)c+=100000;return t+c;},0);
  const cBet=(iB||iR)&&!auto&&tCost>0&&(iB?tCost<=bal:true)&&hands.every(h=>h.bet>0);
  const isBB=iR&&msg&&[...BB1,...BB2,...BB3,...BB4,...BB5,...BB6].includes(msg);
  const multi=nSlots>1;
  // INTRO SCREEN
  if(phase===PH.INTRO)return(<div style={{minHeight:"100vh",background:"#050d08",display:"flex",alignItems:"center",justifyContent:"center",transition:"opacity .7s",opacity:introOp}}><div style={{textAlign:"center",animation:"introFade 2.5s ease"}}><img src={IMG_LOGO} style={{width:120,height:120,marginBottom:16}} alt="Chad Labs"/><div style={{fontSize:28,fontFamily:"'Caveat',cursive",fontWeight:700,color:C.cr,letterSpacing:2}}>Chad Labs</div><div style={{fontSize:14,fontFamily:"'Caveat',cursive",color:C.cd,marginTop:4}}>presents</div></div><style>{`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap');@keyframes introFade{0%{opacity:0;transform:scale(.9)}30%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:1}}`}</style></div>);
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.cr,fontFamily:"'Caveat',cursive",maxWidth:500,margin:"0 auto",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap');@keyframes ci{from{opacity:0;transform:translateY(-10px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes glow{0%,100%{box-shadow:0 0 4px rgba(212,168,64,.2)}50%{box-shadow:0 0 14px rgba(212,168,64,.4)}}button{font-family:'Caveat',cursive;cursor:pointer;transition:all .1s;-webkit-tap-highlight-color:transparent}button:active:not(:disabled){transform:scale(.97);opacity:.85}button:disabled{opacity:.2;cursor:default}`}</style>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"8px 14px 4px",background:`radial-gradient(ellipse at 50% 35%,${C.fl},${C.felt} 55%,${C.bg} 100%)`}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:4,height:28}}><span style={{fontSize:22,fontWeight:700}}>${fmt(bal)}</span></div>
        {/* DEALER */}
        <div style={{minHeight:110,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{dH.length>0?(<><div style={{background:"rgba(0,0,0,.5)",padding:"2px 14px",borderRadius:14,fontSize:18,fontWeight:700,marginBottom:5}}>{(iP||iI)?hv([dH[0]]):(dSf?`${dV-10}, ${dV}`:dV)}</div><div style={{display:"flex"}}>{dH.map((c,i)=><div key={i} style={{marginLeft:i>0?-12:0,zIndex:i}}><Card card={c} hidden={(iP||iI)&&i===1} idx={i}/></div>)}</div></>):<div style={{height:90}}/>}</div>
        {/* DIVIDER + FACT */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",margin:"6px 0",minHeight:36}}><div style={{display:"flex",alignItems:"center",width:"100%",marginBottom:3}}><div style={{flex:1,height:1,background:`${C.gd}18`}}/><span style={{fontSize:14,padding:"0 8px",opacity:.4}}>Blackjack pays 3 to 2</span><div style={{flex:1,height:1,background:`${C.gd}18`}}/></div>{iB&&<div style={{fontSize:13,textAlign:"center",lineHeight:1.4,padding:"0 8px",opacity:.5,fontStyle:"italic",maxWidth:380}}>{fact}</div>}</div>
        {/* INSURANCE */}
        {iI&&(<div style={{display:"flex",justifyContent:"center",padding:"6px 0",animation:"fi .2s ease"}}><div style={{display:"flex",alignItems:"center",gap:10,background:"rgba(0,0,0,.6)",padding:"10px 20px",borderRadius:10,border:`1px solid ${C.gd}30`}}><span style={{fontSize:18,fontWeight:700}}>Insurance?</span><button onClick={()=>hIns(true)} style={{padding:"6px 16px",borderRadius:6,border:"none",background:C.gn,color:"#fff",fontSize:16,fontWeight:700}}>Yes</button><button onClick={()=>hIns(false)} style={{padding:"6px 16px",borderRadius:6,border:"none",background:"rgba(255,255,255,.1)",fontSize:16}}>No</button></div></div>)}
        {/* RESULT */}
        <div style={{minHeight:iI?0:28,display:"flex",alignItems:"center",justifyContent:"center"}}>{msg&&iR&&<span style={{fontSize:isBB?26:22,fontWeight:700,color:isBB?C.rd:C.cr,animation:"fi .3s ease"}}>{msg}</span>}</div>
        {/* HANDS */}
        <div style={{display:"flex",justifyContent:"center",gap:multi?20:14,paddingTop:2,minHeight:220}}>
          {hands.map((h,idx)=>{const isAct=actH===idx&&iP;const v=h.cards.length?hv(h.cards):0;const sf=h.cards.length>=2&&isSoft(h.cards)&&v<=21;const rc=h.res==="win"||h.res==="bj"?"#66ff88":h.res==="push"?C.cd:h.res==="bust"||h.res==="lose"?C.rd:C.cr;const co=multi?-6:-10;return(
            <div key={idx} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,maxWidth:multi?175:210,minWidth:0}}>
              {h.cards.length>0?(<><div style={{background:isAct?"rgba(212,168,64,.15)":"rgba(0,0,0,.45)",padding:"2px 12px",borderRadius:12,fontSize:16,color:rc,marginBottom:4,fontWeight:700,border:isAct?`1px solid ${C.gd}40`:"1px solid transparent",animation:isAct?"glow 1.5s ease infinite":"none"}}>{h.res?h.msg:(sf?`${v-10}/${v}`:v)}</div><div style={{display:"flex"}}>{h.cards.map((c,i)=><div key={i} style={{marginLeft:i>0?co:0,zIndex:i}}><Card card={c} hidden={false} idx={i} small={multi}/></div>)}</div>{h.pay>0&&iR&&<div style={{fontSize:16,color:"#66ff88",marginTop:3,fontWeight:700}}>+${fmt(h.pay)}</div>}</>):(<div style={{display:"flex",marginTop:12}}><div style={{width:multi?50:CW,height:multi?70:CH,borderRadius:7,border:`1.5px dashed ${C.cr}12`,background:`${C.cr}03`}}/><div style={{width:multi?50:CW,height:multi?70:CH,borderRadius:7,border:`1.5px dashed ${C.cr}08`,background:`${C.cr}02`,marginLeft:co}}/></div>)}
              <div style={{marginTop:6,minHeight:44}}><ChipStack bet={h.bet}/></div>
              {iB&&(<div style={{display:"flex",gap:2,marginTop:4,flexWrap:"wrap",justifyContent:"center"}}>{CHIPS.map((ch,i)=>(<button key={i} onClick={()=>addChip(idx,ch.v)} disabled={h.bet+ch.v>bal} style={{width:36,height:36,borderRadius:"50%",padding:0,border:"none",background:"transparent",opacity:h.bet+ch.v>bal?.2:1}}><img src={ch.img} style={{width:36,height:36,borderRadius:"50%"}} alt={ch.l}/></button>))}</div>)}
              {iB&&h.bet>0&&<button onClick={()=>clrBet(idx)} style={{fontSize:13,color:C.cd,background:"none",border:`1px solid ${C.bd}`,borderRadius:4,padding:"2px 10px",marginTop:3}}>Clear</button>}
              <div style={{display:"flex",flexDirection:"column",gap:3,marginTop:6,width:"100%"}}>{[{k:"pp",n:"Perfect Pairs"},{k:"t",n:"21+3"}].map(({k,n})=>(<div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",opacity:lk?(h.sb[k]?.7:.15):1,transition:"all .15s"}}><span style={{fontSize:16,fontWeight:700}}>{n}</span><div onClick={lk?undefined:()=>togSB(idx,k)} style={{width:34,height:18,borderRadius:9,cursor:lk?"default":"pointer",background:h.sb[k]?C.ac:"rgba(255,255,255,.08)",border:`1.5px solid ${h.sb[k]?C.ac:"rgba(255,255,255,.12)"}`,position:"relative",transition:"all .2s",flexShrink:0}}><div style={{width:12,height:12,borderRadius:6,background:h.sb[k]?"#000":C.cr,position:"absolute",top:1.5,left:h.sb[k]?18:2,transition:"all .2s",opacity:h.sb[k]?1:.3}}/></div></div>))}</div>
              {iB&&nSlots>1&&<button onClick={()=>rmSlot(idx)} style={{fontSize:13,color:C.cd,background:"none",border:`1px solid ${C.bd}`,borderRadius:4,padding:"2px 10px",marginTop:4,opacity:.5}}>Remove</button>}
            </div>);})}
          {iB&&nSlots<maxH&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",marginTop:12}}><Ghost onClick={addSlot}/></div>}
        </div>
      </div>
      {/* CONTROLS */}
      <div style={{padding:"6px 14px 8px",background:C.bg,borderTop:`1px solid ${C.sf}`}}>
        {iP&&!auto&&cH?(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}><button onClick={hitH} style={{padding:"13px 0",borderRadius:7,fontSize:18,fontWeight:700,background:C.sa,color:C.cr,border:`1px solid ${C.bd}`}}>Hit</button><button onClick={stdH} style={{padding:"13px 0",borderRadius:7,fontSize:18,fontWeight:700,background:C.sa,color:C.cr,border:`1px solid ${C.bd}`}}>Stand</button><button disabled style={{padding:"13px 0",borderRadius:7,fontSize:18,fontWeight:700,background:C.sf,color:C.cd,border:`1px solid ${C.sf}`}}>Split</button><button onClick={cDb?dblH:undefined} disabled={!cDb} style={{padding:"13px 0",borderRadius:7,fontSize:18,fontWeight:700,background:cDb?C.sa:C.sf,color:cDb?C.cr:C.cd,border:`1px solid ${cDb?C.bd:C.sf}`}}>x2</button></div>):(<button onClick={cBet?hBet:undefined} disabled={!cBet&&!iD&&!iI} style={{width:"100%",padding:"12px 0",borderRadius:8,border:"none",marginBottom:5,background:cBet?`linear-gradient(135deg,${C.gd},#a88a30)`:C.sf,color:cBet?C.bg:C.cd,fontSize:18,fontWeight:700,opacity:(iD||iI||auto||(!cBet&&iB))?.35:1}}>{auto?`Auto ${aN}/${aMax}`:iD?"Dealing...":iI?"Insurance...":iR?"Next Hand":"Deal"}</button>)}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:28}}><div style={{display:"flex",gap:6}}><button onClick={()=>{setShowA(!showA);setShowR(false);}} style={{fontSize:14,padding:"3px 10px",borderRadius:4,border:`1px solid ${showA?C.ac:C.bd}`,background:showA?`${C.ac}12`:"transparent",color:showA?C.ac:C.cd}}>Auto</button><button onClick={()=>{setShowR(!showR);setShowA(false);}} style={{fontSize:14,padding:"3px 10px",borderRadius:4,border:`1px solid ${showR?C.ac:C.bd}`,background:showR?`${C.ac}12`:"transparent",color:showR?C.ac:C.cd}}>Rules</button></div><div style={{minWidth:50,textAlign:"center"}}>{auto&&<button onClick={()=>setAuto(false)} style={{fontSize:14,padding:"3px 10px",borderRadius:4,border:`1px solid ${C.rd}`,background:"transparent",color:C.rd}}>Stop</button>}</div></div>
        {showA&&(<div style={{background:C.sf,borderRadius:6,padding:"8px 10px",marginTop:4,animation:"fi .15s ease"}}><div style={{fontSize:15,marginBottom:3,opacity:.6}}>Speed</div><div style={{display:"flex",gap:3,marginBottom:6}}>{Object.entries(SP).map(([k,v])=>(<button key={k} onClick={()=>setASpd(k)} style={{flex:1,padding:"5px 0",fontSize:14,borderRadius:4,border:`1px solid ${aSpd===k?C.ac:C.bd}`,background:aSpd===k?`${C.ac}12`:"transparent",color:aSpd===k?C.ac:C.cd}}>{v.n}</button>))}</div><div style={{fontSize:12,opacity:.5,marginBottom:6,lineHeight:1.4}}>Auto-play uses basic strategy. Hits below 17, stands on 17+. Insurance auto-declined. Side bets preserved.</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:15,opacity:.6}}>Max Rounds</span><div style={{display:"flex",alignItems:"center",gap:3}}><button onClick={()=>setAMax(m=>Math.max(1,m-10))} style={{width:22,height:22,borderRadius:4,border:`1px solid ${C.bd}`,background:C.bg,color:C.cd,fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>-</button><span style={{fontSize:16,width:28,textAlign:"center",fontWeight:700}}>{aMax}</span><button onClick={()=>setAMax(m=>Math.min(1000,m+10))} style={{width:22,height:22,borderRadius:4,border:`1px solid ${C.bd}`,background:C.bg,color:C.cd,fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div></div><button onClick={()=>{if(auto)setAuto(false);else{setAN(0);setAuto(true);if(phase===PH.RES)hBet();}}} style={{width:"100%",padding:"8px 0",borderRadius:5,border:"none",fontSize:15,fontWeight:700,background:auto?C.rd:C.gn,color:"#fff"}}>{auto?"Stop Auto":"Start Auto"}</button></div>)}
        {showR&&(<div style={{background:C.sf,borderRadius:6,padding:"10px 12px",marginTop:4,animation:"fi .15s ease",maxHeight:280,overflowY:"auto"}}><div style={{fontSize:18,fontWeight:700,marginBottom:8}}>How To Play</div><div style={{fontSize:15,lineHeight:1.6}}><div style={{fontWeight:700,marginBottom:4}}>Payouts</div><div style={{marginLeft:8,marginBottom:8}}>Blackjack pays 3:2<br/>Winning hand pays 1:1<br/>If the dealer has Blackjack, insurance pays 2:1</div><div style={{fontWeight:700,marginBottom:4}}>Perfect Pairs</div><table style={{width:"100%",marginBottom:8,fontSize:14}}><thead><tr><td>Hand</td><td style={{textAlign:"right"}}>Payout</td></tr></thead><tbody><tr><td style={{opacity:.7}}>Perfect Pair</td><td style={{textAlign:"right"}}>25:1</td></tr><tr><td style={{opacity:.7}}>Coloured Pair</td><td style={{textAlign:"right"}}>12:1</td></tr><tr><td style={{opacity:.7}}>Mixed Pair</td><td style={{textAlign:"right"}}>6:1</td></tr></tbody></table><div style={{fontWeight:700,marginBottom:4}}>21+3</div><table style={{width:"100%",marginBottom:8,fontSize:14}}><thead><tr><td>Hand</td><td style={{textAlign:"right"}}>Payout</td></tr></thead><tbody><tr><td style={{opacity:.7}}>Suited Trips</td><td style={{textAlign:"right"}}>100:1</td></tr><tr><td style={{opacity:.7}}>Straight Flush</td><td style={{textAlign:"right"}}>40:1</td></tr><tr><td style={{opacity:.7}}>Three of a Kind</td><td style={{textAlign:"right"}}>30:1</td></tr><tr><td style={{opacity:.7}}>Straight</td><td style={{textAlign:"right"}}>10:1</td></tr><tr><td style={{opacity:.7}}>Flush</td><td style={{textAlign:"right"}}>5:1</td></tr></tbody></table><div style={{fontWeight:700,marginBottom:4}}>Return to Player</div><div style={{marginLeft:8,marginBottom:4,fontSize:13,opacity:.7}}>Blackjack — 98.7%*<br/>Perfect Pairs bet — 86.4952%<br/>21+3 bet — 85.7029%<br/><br/>*simulation-backed estimate using current 1,000,000-round basic-strategy runs.<br/><br/>A player's skill and/or strategy will have an impact on their chances of winning.<br/><br/>Please note that any malfunction voids the game round and all eventual payouts for the round.</div></div></div>)}
        {bal<=0&&iB&&<button onClick={()=>setBal(100000000)} style={{width:"100%",padding:"8px 0",borderRadius:5,border:`1px solid ${C.bd}`,background:"transparent",fontSize:15,marginTop:4}}>Reload $100</button>}
      </div>
    </div>
  );
}
